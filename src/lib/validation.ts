/**
 * Booking form validation. Pure and dependency-free so the client (instant
 * feedback, as in the prototype) and the server action share one rule set.
 * Returns message *keys* under `booking.errors.*` in messages/ar.json.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MAX_NAME = 120;
export const MAX_TOPIC = 1000;

export type BookingInput = { slot?: string; name?: string; email?: string; topic?: string };
export type BookingErrorKey =
  | "slotRequired"
  | "slotTaken"
  | "nameRequired"
  | "nameTooLong"
  | "emailRequired"
  | "emailInvalid"
  | "topicTooLong";
export type BookingErrors = Partial<Record<"slot" | "name" | "email" | "topic", BookingErrorKey>>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateBooking(input: BookingInput): BookingErrors {
  const e: BookingErrors = {};
  if (!input.slot || Number.isNaN(Date.parse(input.slot))) e.slot = "slotRequired";

  const name = (input.name ?? "").trim();
  if (!name) e.name = "nameRequired";
  else if (name.length > MAX_NAME) e.name = "nameTooLong";

  const email = (input.email ?? "").trim();
  if (!email) e.email = "emailRequired";
  else if (!EMAIL_RE.test(email) || email.length > 254) e.email = "emailInvalid";

  if ((input.topic ?? "").length > MAX_TOPIC) e.topic = "topicTooLong";
  return e;
}

/** Field order used to move focus to the first invalid field. */
export const FIELD_ORDER = ["slot", "name", "email", "topic"] as const;
