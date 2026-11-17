import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import StreamSDK from "@streamsdk/typescript";
import { METHOD_LABELS, type CheckoutRequest, type CheckoutSession, type PaymentProvider, type ProviderStatus } from "./types";

/**
 * StreamPay (Stream, streampay.sa) integration via the official SDK.
 *
 * Flow: one single-use payment link per checkout attempt. The payer is sent
 * to StreamPay's hosted page (mada, Visa/Mastercard, Apple Pay, … as enabled
 * for the merchant account), so card data never touches our servers.
 * Our Payment id travels in `custom_metadata`, which StreamPay echoes in
 * webhook payloads.
 */

const PAID_LINK_STATES = new Set(["COMPLETED"]);
const PAID_PAYMENT_STATES = new Set(["SUCCEEDED", "SETTLED"]);
const FAILED_PAYMENT_STATES = new Set(["FAILED", "FAILED_INITIATION", "CANCELED", "EXPIRED"]);

function client() {
  const apiKey = process.env.STREAMPAY_API_KEY;
  if (!apiKey) throw new Error("STREAMPAY_API_KEY is not set");
  // StreamPay issues an API key + secret pair; the API expects base64("key:secret")
  // in the x-api-key header. A pre-encoded key (no secret given) is used as-is.
  const secret = process.env.STREAMPAY_API_SECRET;
  const token = secret ? Buffer.from(`${apiKey}:${secret}`).toString("base64") : apiKey;
  return StreamSDK.init(token, { baseUrl: process.env.STREAMPAY_API_BASE || undefined });
}

export const streamPayProvider: PaymentProvider = {
  id: "streampay",

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const sdk = client();
    const amount = req.amountHalalas / 100;
    const res = await sdk.createSimplePaymentLink({
      name: req.title,
      description: req.description,
      currency: req.currency,
      amount,
      consumer: { name: req.customer.name, email: req.customer.email },
      // Reused across bookings: StreamPay matches products by name + price.
      product: { name: req.productName, price: amount, currency: req.currency },
      maxNumberOfPayments: 1,
      validUntil: req.validUntil,
      successRedirectUrl: req.successUrl,
      failureRedirectUrl: req.failureUrl,
      contactInformationType: "EMAIL",
      customMetadata: {
        khatwah_payment_id: req.paymentId,
        khatwah_booking_id: req.bookingId,
        khatwah_booking_ref: req.bookingRef,
      },
    });
    const providerRef = res.paymentLink.id;
    if (!providerRef || !res.paymentUrl) throw new Error("StreamPay returned no payment link");
    return { providerRef, checkoutUrl: res.paymentUrl, raw: res.paymentLink };
  },

  async fetchStatus(providerRef: string): Promise<ProviderStatus> {
    const link = await client().getPaymentLink(providerRef);
    const collected = link.amount_collected_in_smallest_unit ?? 0;
    const due = link.amount_in_smallest_unit ?? Number.POSITIVE_INFINITY;
    if ((link.status && PAID_LINK_STATES.has(link.status)) || collected >= due) {
      return { status: "PAID", raw: link };
    }
    return { status: "PENDING", raw: link };
  },
};

// ─── Webhooks ────────────────────────────────────────────────────────

/**
 * Verifies the `x-webhook-signature` header: "t=<unix>,v1=<hex>", where
 * v1 = HMAC-SHA256(secret, `${t}.${body}`). Mirrors @streamsdk/express,
 * which signs the JSON-serialised body, so both the raw body and its
 * re-serialisation are accepted. Rejects timestamps older than 5 minutes.
 */
export function verifyStreamPaySignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(t) || !sig || Math.abs(nowSec - t) > 300) return false;

  const candidates = [rawBody];
  try {
    candidates.push(JSON.stringify(JSON.parse(rawBody)));
  } catch {
    /* not JSON */
  }
  return candidates.some((body) => {
    const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Depth-first search for a key anywhere in a JSON value. */
export function findKey(value: unknown, key: string, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== "object") return undefined;
  if (!Array.isArray(value) && key in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>)[key];
  }
  for (const v of Object.values(value as Record<string, unknown>)) {
    const found = findKey(v, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

export type StreamPayWebhook = {
  eventType: string;
  paymentId?: string;
  paymentLinkId?: string;
  methodLabel?: string;
  /** What the event claims; always re-checked against the API before acting. */
  claimed: "PAID" | "FAILED" | "OTHER";
};

export function parseStreamPayWebhook(payload: unknown): StreamPayWebhook {
  const p = (payload ?? {}) as Record<string, unknown>;
  const eventType = String(p.event_type ?? p.event ?? "unknown");
  const paymentId = findKey(payload, "khatwah_payment_id");
  const linkId = findKey(payload, "payment_link_id");
  const method = findKey(payload, "payment_method");
  const status = String(findKey(payload, "current_status") ?? p.status ?? "");

  let claimed: StreamPayWebhook["claimed"] = "OTHER";
  if (eventType === "PAYMENT_SUCCEEDED" || eventType === "PAYMENT_MARKED_AS_PAID" || PAID_PAYMENT_STATES.has(status)) {
    claimed = "PAID";
  } else if (eventType === "PAYMENT_FAILED" || eventType === "PAYMENT_CANCELED" || FAILED_PAYMENT_STATES.has(status)) {
    claimed = "FAILED";
  }

  return {
    eventType,
    paymentId: typeof paymentId === "string" ? paymentId : undefined,
    paymentLinkId: typeof linkId === "string" ? linkId : undefined,
    methodLabel: typeof method === "string" ? (METHOD_LABELS[method] ?? method) : undefined,
    claimed,
  };
}
