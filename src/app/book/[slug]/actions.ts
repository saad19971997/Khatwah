"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SlotUnavailableError, createHeldBooking } from "@/lib/bookings";
import { validateBooking, type BookingErrors } from "@/lib/validation";

export type BookingFormState = {
  errors: BookingErrors;
  values: { slot: string; name: string; email: string; topic: string };
};

export async function submitBooking(_prev: BookingFormState, formData: FormData): Promise<BookingFormState> {
  const values = {
    slot: String(formData.get("slot") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    topic: String(formData.get("topic") ?? ""),
  };
  const slug = String(formData.get("consultant") ?? "");

  const errors = validateBooking(values);
  if (Object.keys(errors).length) return { errors, values };

  const consultant = await db.consultant.findUnique({ where: { slug } });
  if (!consultant || !consultant.active) redirect("/consultants");

  const session = await auth();
  let bookingId: string;
  try {
    const booking = await createHeldBooking({
      consultantId: consultant.id,
      startsAt: new Date(values.slot),
      name: values.name,
      email: values.email,
      topic: values.topic,
      // Book under the signed-in account only if it is the same email.
      userId:
        session?.user?.email && session.user.email.toLowerCase() === values.email.trim().toLowerCase()
          ? session.user.id
          : undefined,
    });
    bookingId = booking.id;
  } catch (e) {
    if (e instanceof SlotUnavailableError) {
      return { errors: { slot: "slotTaken" }, values: { ...values, slot: "" } };
    }
    throw e;
  }
  redirect(`/checkout/${bookingId}`);
}
