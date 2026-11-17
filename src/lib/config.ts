/** Platform-wide constants. */

/** All schedules are expressed and displayed in this zone. */
export const TIME_ZONE = "Asia/Riyadh";

/** BCP-47 locale for display: Arabic, Arabic-Indic digits, Gregorian calendar. */
export const DISPLAY_LOCALE = "ar-SA-u-nu-arab-ca-gregory";

/** How many days ahead clients can book. */
export const BOOKING_WINDOW_DAYS = 14;

/** Minimum notice before a session can be booked, in minutes. */
export const MIN_LEAD_MINUTES = 12 * 60;

/** How long a slot is held while the client completes payment, in minutes. */
export const PAYMENT_HOLD_MINUTES = 15;

export const CURRENCY = "SAR";

export function appUrl(path = ""): string {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}
