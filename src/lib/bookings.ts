import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { PAYMENT_HOLD_MINUTES } from "./config";
import { generateRef } from "./ref";
import { getAvailableSlots } from "./slots";
import { normalizeEmail } from "./validation";

export class SlotUnavailableError extends Error {
  constructor() {
    super("slot unavailable");
  }
}

function isUniqueViolation(e: unknown, target?: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!target) return true;
  return JSON.stringify(e.meta?.target ?? "").includes(target);
}

/**
 * Creates a PENDING_PAYMENT booking that holds the slot for PAYMENT_HOLD_MINUTES.
 *
 * Double booking is prevented by the partial unique index
 * "Booking_active_slot_unique" (consultantId, startsAt) over held/confirmed
 * bookings: of two concurrent requests for one slot, exactly one succeeds.
 */
export async function createHeldBooking(input: {
  consultantId: string;
  startsAt: Date;
  name: string;
  email: string;
  topic?: string;
  /** Signed-in user, if any; otherwise the account is found/created by email. */
  userId?: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const slots = await getAvailableSlots(input.consultantId, now);
  const slot = slots.find((s) => s.startsAt.getTime() === input.startsAt.getTime());
  if (!slot) throw new SlotUnavailableError();

  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        // A lapsed hold on this exact slot still occupies the unique index; release it.
        await tx.booking.updateMany({
          where: {
            consultantId: input.consultantId,
            startsAt: slot.startsAt,
            status: "PENDING_PAYMENT",
            holdExpiresAt: { lte: now },
          },
          data: { status: "EXPIRED" },
        });

        const user = input.userId
          ? await tx.user.findUniqueOrThrow({ where: { id: input.userId } })
          : await tx.user.upsert({ where: { email }, create: { email, name }, update: {} });
        if (!user.name) await tx.user.update({ where: { id: user.id }, data: { name } });

        return tx.booking.create({
          data: {
            ref: generateRef(),
            userId: user.id,
            consultantId: input.consultantId,
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            topic: input.topic?.trim() || null,
            status: "PENDING_PAYMENT",
            holdExpiresAt: new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000),
          },
        });
      });
    } catch (e) {
      if (isUniqueViolation(e, "ref")) continue; // astronomically rare: retry with a new ref
      if (isUniqueViolation(e)) throw new SlotUnavailableError();
      throw e;
    }
  }
  throw new Error("Could not allocate a booking reference");
}

/** Booking with everything the checkout / confirmation screens need. */
export function getBookingForDisplay(id: string) {
  return db.booking.findUnique({
    where: { id },
    include: {
      consultant: true,
      user: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export type BookingForDisplay = NonNullable<Awaited<ReturnType<typeof getBookingForDisplay>>>;
