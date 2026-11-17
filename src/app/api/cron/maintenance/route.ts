import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expireStaleHolds } from "@/lib/slots";
import { fulfillBooking, syncPayment } from "@/lib/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Periodic maintenance (Vercel Cron, every 10 minutes — see vercel.json):
 *  1. reconcile recent pending payments with the provider (missed webhooks)
 *  2. expire lapsed slot holds
 *  3. retry Meet-link creation / confirmation emails that failed
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = new Date();

  const pending = await db.payment.findMany({
    where: { status: "PENDING", providerRef: { not: null }, createdAt: { gt: new Date(now.getTime() - 2 * 86_400_000) } },
    select: { id: true },
    take: 50,
  });
  let reconciled = 0;
  for (const p of pending) {
    try {
      const r = await syncPayment(p.id);
      if (r === "confirmed") reconciled++;
    } catch (e) {
      console.error(`[cron] sync payment ${p.id} failed`, e);
    }
  }

  const expired = await expireStaleHolds(now);

  const unfulfilled = await db.booking.findMany({
    where: { status: "CONFIRMED", notifiedAt: null, startsAt: { gt: now } },
    select: { id: true },
    take: 25,
  });
  let fulfilled = 0;
  for (const b of unfulfilled) {
    try {
      await fulfillBooking(b.id);
      fulfilled++;
    } catch (e) {
      console.error(`[cron] fulfil booking ${b.id} failed`, e);
    }
  }

  return NextResponse.json({ ok: true, reconciled, expired, fulfilled });
}
