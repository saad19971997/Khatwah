import "server-only";
import { Prisma } from "@prisma/client";
import { appUrl, PAYMENT_HOLD_MINUTES } from "../config";
import { db } from "../db";
import { formatDateTime, formatDuration, formatPrice } from "../format";
import { buildIcs } from "../ics";
import { createMeetEvent, isCalendarEnabled } from "../google/calendar";
import { sendEmail } from "../email/send";
import { bookingConfirmedEmail, consultantNotificationEmail, type BookingEmailData } from "../email/templates";
import { getPaymentProvider, paymentProviderId } from "./index";

export class CheckoutUnavailableError extends Error {
  constructor(public readonly reason: "not_found" | "not_pending" | "expired") {
    super(`checkout unavailable: ${reason}`);
  }
}

/**
 * Starts a payment attempt for a held booking and returns the hosted checkout
 * URL. Each attempt gets its own Payment row and provider link, so a failed
 * attempt can be retried cleanly. The hold is extended to cover the attempt.
 */
export async function startCheckout(bookingId: string, now = new Date()): Promise<string> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { consultant: true, user: true },
  });
  if (!booking) throw new CheckoutUnavailableError("not_found");
  if (booking.status !== "PENDING_PAYMENT") throw new CheckoutUnavailableError("not_pending");
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) throw new CheckoutUnavailableError("expired");

  const holdUntil = new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000);
  const provider = getPaymentProvider();

  const payment = await db.$transaction(async (tx) => {
    // Abandon earlier unfinished attempts; only the newest link should be payable.
    await tx.payment.updateMany({ where: { bookingId, status: "PENDING" }, data: { status: "FAILED" } });
    await tx.booking.update({ where: { id: bookingId }, data: { holdExpiresAt: holdUntil } });
    return tx.payment.create({
      data: {
        bookingId,
        provider: provider.id,
        amountHalalas: booking.consultant.priceHalalas,
        currency: "SAR",
        status: "PENDING",
      },
    });
  });

  const session = await provider.createCheckout({
    paymentId: payment.id,
    bookingId,
    bookingRef: booking.ref,
    amountHalalas: payment.amountHalalas,
    currency: "SAR",
    title: `خطوة · طلب ${booking.ref}`,
    description: `جلسة ${formatDuration(booking.consultant.durationMin)} مع ${booking.consultant.name} — ${formatDateTime(booking.startsAt)} بتوقيت الرياض`,
    productName: `جلسة ${formatDuration(booking.consultant.durationMin)} — ${booking.consultant.name}`,
    customer: { name: booking.user.name ?? booking.user.email, email: booking.user.email },
    successUrl: appUrl(`/checkout/${bookingId}/return`),
    failureUrl: appUrl(`/checkout/${bookingId}?status=failed`),
    validUntil: holdUntil,
  });

  await db.payment.update({
    where: { id: payment.id },
    data: {
      providerRef: session.providerRef,
      checkoutUrl: session.checkoutUrl,
      rawPayload: (session.raw ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
  return session.checkoutUrl;
}

export type ApplyResult = "confirmed" | "already_processed" | "failed" | "paid_but_slot_lost" | "ignored";

/**
 * Records a successful payment and confirms its booking. Idempotent: the
 * PENDING→PAID transition is a conditional update, so repeated webhooks,
 * the return-page check and the mock page can all call this safely.
 */
export async function markPaymentPaid(
  paymentId: string,
  opts: { methodLabel?: string; raw?: unknown; now?: Date } = {},
): Promise<ApplyResult> {
  const now = opts.now ?? new Date();
  const result = await db.$transaction(async (tx): Promise<ApplyResult> => {
    const { count } = await tx.payment.updateMany({
      // FAILED included: a late success for an attempt we had abandoned still counts.
      where: { id: paymentId, status: { in: ["PENDING", "FAILED"] } },
      data: {
        status: "PAID",
        paidAt: now,
        ...(opts.methodLabel ? { methodLabel: opts.methodLabel } : {}),
        ...(opts.raw !== undefined ? { rawPayload: opts.raw as Prisma.InputJsonValue } : {}),
      },
    });
    if (count === 0) return "already_processed";

    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: payment.bookingId } });
    if (booking.status === "CONFIRMED") return "already_processed";

    // Normally PENDING_PAYMENT. If the hold lapsed first (EXPIRED), confirm it
    // anyway when the slot is still free; the unique index decides.
    try {
      await tx.$executeRaw`SAVEPOINT confirm_booking`;
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED", confirmedAt: now, holdExpiresAt: null },
      });
      await tx.$executeRaw`RELEASE SAVEPOINT confirm_booking`;
      return "confirmed";
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        await tx.$executeRaw`ROLLBACK TO SAVEPOINT confirm_booking`;
        return "paid_but_slot_lost";
      }
      throw e;
    }
  });

  if (result === "paid_but_slot_lost") {
    // Requires a manual refund from the StreamPay dashboard.
    console.error(`[payments] Payment ${paymentId} succeeded but its slot was taken meanwhile — refund needed.`);
  }
  if (result === "confirmed") {
    const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await fulfillBooking(payment.bookingId).catch((e) =>
      console.error(`[fulfil] booking ${payment.bookingId} failed; will be retried by cron`, e),
    );
  }
  return result;
}

export async function markPaymentFailed(paymentId: string, raw?: unknown): Promise<ApplyResult> {
  const { count } = await db.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED", ...(raw !== undefined ? { rawPayload: raw as Prisma.InputJsonValue } : {}) },
  });
  return count ? "failed" : "already_processed";
}

/**
 * Asks the provider for the authoritative status of a payment and applies it.
 * Used by webhooks (never trusting the payload alone) and the return page.
 */
export async function syncPayment(paymentId: string, hint?: { methodLabel?: string }): Promise<ApplyResult> {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment?.providerRef) return "ignored";
  if (payment.status === "PAID") return "already_processed";
  const status = await getPaymentProvider(payment.provider).fetchStatus(payment.providerRef);
  if (status.status === "PAID") {
    return markPaymentPaid(payment.id, { methodLabel: status.methodLabel ?? hint?.methodLabel, raw: status.raw });
  }
  if (status.status === "FAILED") return markPaymentFailed(payment.id, status.raw);
  return "ignored";
}

/** Syncs the newest payment attempt of a booking (return page). */
export async function syncLatestPayment(bookingId: string): Promise<ApplyResult> {
  const latest = await db.payment.findFirst({ where: { bookingId }, orderBy: { createdAt: "desc" } });
  if (!latest) return "ignored";
  return syncPayment(latest.id);
}

/**
 * After confirmation: create the Google Meet event (once) and send the
 * confirmation emails (once). Safe to call repeatedly; the cron job retries it
 * for confirmed bookings that are missing either.
 */
export async function fulfillBooking(bookingId: string): Promise<void> {
  let booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { consultant: true, user: true, payments: { where: { status: "PAID" }, take: 1 } },
  });
  if (booking.status !== "CONFIRMED") return;

  const when = formatDateTime(booking.startsAt);
  const clientName = booking.user.name ?? booking.user.email;

  if (!booking.calendarEventId && isCalendarEnabled()) {
    const event = await createMeetEvent({
      requestId: booking.id,
      summary: `جلسة خطوة: ${clientName} × ${booking.consultant.name}`,
      description: [
        `رقم الطلب: ${booking.ref}`,
        `المستشار: ${booking.consultant.name} (${booking.consultant.role})`,
        `العميل: ${clientName}`,
        booking.topic ? `الموضوع: ${booking.topic}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      start: booking.startsAt,
      end: booking.endsAt,
      attendees: [
        { email: booking.user.email, displayName: clientName },
        { email: booking.consultant.email, displayName: booking.consultant.name },
      ],
    });
    booking = await db.booking.update({
      where: { id: booking.id },
      data: { calendarEventId: event.eventId, meetUrl: event.meetUrl },
      include: { consultant: true, user: true, payments: { where: { status: "PAID" }, take: 1 } },
    });
  }

  // Wait for the Meet link before emailing, unless calendar integration is off.
  if (isCalendarEnabled() && !booking.meetUrl) return;

  // Claim the notification so concurrent calls send it only once.
  const { count } = await db.booking.updateMany({
    where: { id: booking.id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  if (count === 0) return;

  const bookingUrl = appUrl(`/bookings/${booking.id}`);
  const data: BookingEmailData = {
    ref: booking.ref,
    clientName,
    clientEmail: booking.user.email,
    consultantName: booking.consultant.name,
    consultantRole: booking.consultant.role,
    dateTime: when,
    duration: formatDuration(booking.consultant.durationMin),
    price: formatPrice(booking.payments[0]?.amountHalalas ?? booking.consultant.priceHalalas),
    topic: booking.topic,
    meetUrl: booking.meetUrl,
    bookingUrl,
    ics: bookingIcs(booking),
  };
  try {
    await sendEmail(bookingConfirmedEmail(data));
    await sendEmail(consultantNotificationEmail({ ...data, consultantEmail: booking.consultant.email }));
  } catch (e) {
    // Release the claim so the cron job retries.
    await db.booking.update({ where: { id: booking.id }, data: { notifiedAt: null } });
    throw e;
  }
}

export function bookingIcs(b: {
  id: string;
  ref: string;
  startsAt: Date;
  endsAt: Date;
  meetUrl: string | null;
  consultant: { name: string; role: string };
}): string {
  return buildIcs({
    uid: `${b.id}@khatwah`,
    start: b.startsAt,
    end: b.endsAt,
    title: `جلسة خطوة مع ${b.consultant.name}`,
    description: `${b.consultant.role}\nرقم الطلب: ${b.ref}${b.meetUrl ? `\nرابط الجلسة: ${b.meetUrl}` : ""}`,
    location: b.meetUrl ?? "Google Meet",
    url: b.meetUrl ?? appUrl(`/bookings/${b.id}`),
  });
}

export function isMockPayments(): boolean {
  return paymentProviderId() === "mock";
}
