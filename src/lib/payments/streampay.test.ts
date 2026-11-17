import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { findKey, parseStreamPayWebhook, verifyStreamPaySignature } from "./streampay";

const secret = "whsec_test";
const sign = (body: string, t: number) => `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;

describe("verifyStreamPaySignature", () => {
  const body = JSON.stringify({ event_type: "PAYMENT_SUCCEEDED", data: { id: "p1" } });
  const now = 1_800_000_000;

  it("accepts a valid signature", () => {
    expect(verifyStreamPaySignature(body, sign(body, now), secret, now)).toBe(true);
  });
  it("accepts a signature over the re-serialised JSON body (as @streamsdk/express does)", () => {
    const pretty = JSON.stringify(JSON.parse(body), null, 2);
    expect(verifyStreamPaySignature(pretty, sign(body, now), secret, now)).toBe(true);
  });
  it("rejects tampered bodies, wrong secrets, stale timestamps and missing headers", () => {
    expect(verifyStreamPaySignature(body.replace("p1", "p2"), sign(body, now), secret, now)).toBe(false);
    expect(verifyStreamPaySignature(body, sign(body, now), "other", now)).toBe(false);
    expect(verifyStreamPaySignature(body, sign(body, now - 301), secret, now)).toBe(false);
    expect(verifyStreamPaySignature(body, null, secret, now)).toBe(false);
    expect(verifyStreamPaySignature(body, "garbage", secret, now)).toBe(false);
  });
});

describe("parseStreamPayWebhook", () => {
  it("finds our metadata wherever StreamPay nests it", () => {
    const payload = {
      event_type: "PAYMENT_SUCCEEDED",
      entity_type: "PAYMENT",
      data: {
        payment_method: "MADA",
        current_status: "SUCCEEDED",
        invoice: { payment_link_id: "link-1", custom_metadata: { khatwah_payment_id: "pay_1" } },
      },
    };
    expect(parseStreamPayWebhook(payload)).toEqual({
      eventType: "PAYMENT_SUCCEEDED",
      paymentId: "pay_1",
      paymentLinkId: "link-1",
      methodLabel: "مدى",
      claimed: "PAID",
    });
  });
  it("classifies failures and unrelated events", () => {
    expect(parseStreamPayWebhook({ event_type: "PAYMENT_FAILED", data: {} }).claimed).toBe("FAILED");
    expect(parseStreamPayWebhook({ event_type: "INVOICE_CREATED", data: {} }).claimed).toBe("OTHER");
  });
  it("findKey is depth-limited and handles arrays", () => {
    expect(findKey({ a: [{ b: { k: 1 } }] }, "k")).toBe(1);
    expect(findKey(null, "k")).toBeUndefined();
  });
});
