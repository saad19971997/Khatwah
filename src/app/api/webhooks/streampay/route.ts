import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseStreamPayWebhook, verifyStreamPaySignature } from "@/lib/payments/streampay";
import { markPaymentFailed, syncPayment } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * StreamPay webhook. Configure in the StreamPay dashboard:
 *   URL:    {APP_URL}/api/webhooks/streampay
 *   Secret: STREAMPAY_WEBHOOK_SECRET
 *
 * The payload is never trusted on its own: a "paid" event only triggers an
 * authoritative status lookup through the StreamPay API.
 */
export async function POST(req: Request) {
  const raw = await req.text();

  const secret = process.env.STREAMPAY_WEBHOOK_SECRET;
  if (secret && !verifyStreamPaySignature(raw, req.headers.get("x-webhook-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = parseStreamPayWebhook(payload);
  const eventId = createHash("sha256").update(raw).digest("hex");

  // Deduplicate retried deliveries.
  try {
    await db.webhookEvent.create({
      data: { provider: "streampay", providerEventId: eventId, type: event.eventType, payload: payload as Prisma.InputJsonValue },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  const payment = event.paymentId
    ? await db.payment.findUnique({ where: { id: event.paymentId } })
    : event.paymentLinkId
      ? await db.payment.findUnique({ where: { providerRef: event.paymentLinkId } })
      : null;
  if (!payment || payment.provider !== "streampay") {
    return NextResponse.json({ ok: true, ignored: "no matching payment" });
  }

  try {
    if (event.claimed === "PAID") {
      const result = await syncPayment(payment.id, { methodLabel: event.methodLabel });
      return NextResponse.json({ ok: true, result });
    }
    if (event.claimed === "FAILED") {
      const result = await markPaymentFailed(payment.id, payload);
      return NextResponse.json({ ok: true, result });
    }
    return NextResponse.json({ ok: true, ignored: event.eventType });
  } catch (e) {
    console.error("[webhook:streampay] processing failed", e);
    // Allow StreamPay to retry: forget this delivery.
    await db.webhookEvent.deleteMany({ where: { provider: "streampay", providerEventId: eventId } });
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
