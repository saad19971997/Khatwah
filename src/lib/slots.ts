import "server-only";
import { db } from "./db";
import { generateSlots, type Slot } from "./availability";
import { BOOKING_WINDOW_DAYS } from "./config";

/** Bookings that currently occupy a slot: confirmed, or held and not yet expired. */
export function activeBookingWhere(now: Date) {
  return {
    OR: [
      { status: "CONFIRMED" as const },
      { status: "PENDING_PAYMENT" as const, holdExpiresAt: { gt: now } },
    ],
  };
}

export async function getAvailableSlots(consultantId: string, now = new Date()): Promise<Slot[]> {
  const consultant = await db.consultant.findUnique({
    where: { id: consultantId },
    include: { availability: true, exceptions: true },
  });
  if (!consultant || !consultant.active) return [];

  const horizon = new Date(now.getTime() + (BOOKING_WINDOW_DAYS + 2) * 86_400_000);
  const taken = await db.booking.findMany({
    where: { consultantId, startsAt: { lt: horizon }, endsAt: { gt: now }, ...activeBookingWhere(now) },
    select: { startsAt: true, endsAt: true },
  });

  return generateSlots({
    rules: consultant.availability,
    blockedDates: consultant.exceptions.map((e) => e.date),
    durationMin: consultant.durationMin,
    taken,
    now,
  });
}

/**
 * Marks held bookings whose hold has lapsed as EXPIRED. Slot calculation
 * already ignores lapsed holds; this keeps the table tidy and frees the
 * partial unique index for the slot.
 */
export async function expireStaleHolds(now = new Date()): Promise<number> {
  const { count } = await db.booking.updateMany({
    where: { status: "PENDING_PAYMENT", holdExpiresAt: { lte: now } },
    data: { status: "EXPIRED" },
  });
  return count;
}
