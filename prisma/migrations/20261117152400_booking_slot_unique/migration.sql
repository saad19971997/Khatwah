-- Prevent double booking: at most one active (held or confirmed) booking
-- per consultant per start time. Expired/cancelled bookings free the slot.
CREATE UNIQUE INDEX "Booking_active_slot_unique"
  ON "Booking" ("consultantId", "startsAt")
  WHERE "status" IN ('PENDING_PAYMENT', 'CONFIRMED');
