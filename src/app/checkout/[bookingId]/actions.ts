"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { CheckoutUnavailableError, startCheckout } from "@/lib/payments/service";

export async function payNow(bookingId: string): Promise<void> {
  let url: string;
  try {
    url = await startCheckout(bookingId);
  } catch (e) {
    if (e instanceof CheckoutUnavailableError) redirect(`/checkout/${bookingId}`);
    console.error("[checkout] could not start payment", e);
    redirect(`/checkout/${bookingId}?status=error`);
  }
  redirect(url);
}

/** "Back to booking details": release the held slot so it can be re-chosen. */
export async function backToDetails(bookingId: string): Promise<void> {
  const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { consultant: true } });
  if (!booking) redirect("/consultants");
  const paid = await db.payment.count({ where: { bookingId, status: "PAID" } });
  if (booking.status === "PENDING_PAYMENT" && paid === 0) {
    await db.$transaction([
      db.payment.updateMany({ where: { bookingId, status: "PENDING" }, data: { status: "FAILED" } }),
      db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED", holdExpiresAt: null } }),
    ]);
  }
  redirect(`/book/${booking.consultant.slug}`);
}
