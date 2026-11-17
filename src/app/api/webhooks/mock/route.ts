import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isMockPayments, markPaymentFailed, markPaymentPaid } from "@/lib/payments/service";

export const dynamic = "force-dynamic";

/**
 * Test hook mirroring the StreamPay webhook path, available only with
 * PAYMENT_PROVIDER=mock. Body: { eventId, paymentRef, status: "PAID" | "FAILED" }.
 */
export async function POST(req: Request) {
  if (!isMockPayments() || process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_WEBHOOK !== "1") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await req.json()) as { eventId?: string; paymentRef?: string; status?: string };
  if (!body.eventId || !body.paymentRef) return NextResponse.json({ error: "bad request" }, { status: 400 });

  try {
    await db.webhookEvent.create({ data: { provider: "mock", providerEventId: body.eventId, type: body.status } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }
  const payment = await db.payment.findUnique({ where: { providerRef: body.paymentRef } });
  if (!payment) return NextResponse.json({ ok: true, ignored: "no matching payment" });
  const result =
    body.status === "PAID"
      ? await markPaymentPaid(payment.id, { methodLabel: "مدى (تجريبي)" })
      : await markPaymentFailed(payment.id);
  return NextResponse.json({ ok: true, result });
}
