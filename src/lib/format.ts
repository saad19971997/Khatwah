import { DISPLAY_LOCALE, TIME_ZONE } from "./config";

const numberFmt = new Intl.NumberFormat(DISPLAY_LOCALE, { maximumFractionDigits: 2 });

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

/** Arabic-Indic digits for any number embedded in a string (e.g. "KH-482615" stays as-is). */
export function toArabicDigits(s: string | number): string {
  return String(s).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

/**
 * The word "ريال" agreeing with the number before it (Arabic counted-noun rules):
 *   1 → ريال، 2 → ريالان، 3–10 → ريالات، 11–99 → ريالًا، 100s/1000s → ريال
 * Uses the last two digits of the integer part, as Arabic grammar does.
 */
export function riyalWord(amount: number): string {
  if (!Number.isInteger(amount)) return "ريال";
  const n = Math.abs(amount);
  if (n === 1) return "ريال";
  if (n === 2) return "ريالان";
  const lastTwo = n % 100;
  if (lastTwo >= 3 && lastTwo <= 10) return "ريالات";
  if (lastTwo >= 11 && lastTwo <= 99) return "ريالًا";
  return "ريال";
}

export function halalasToSar(halalas: number): number {
  return halalas / 100;
}

/** "١٥٠ ريال سعودي" — the price chip / summary format from the design. */
export function formatPrice(halalas: number): string {
  return `${formatNumber(halalasToSar(halalas))} ريال سعودي`;
}

/** "ادفع ١٥٠ ريالًا" — pay button label from the design. */
export function payLabel(halalas: number): string {
  const sar = halalasToSar(halalas);
  return `ادفع ${formatNumber(sar)} ${riyalWord(sar)}`;
}

/** "٣٠ دقيقة" / "٤٥ دقيقة" / "ساعة" */
export function formatDuration(minutes: number): string {
  if (minutes === 60) return "ساعة";
  if (minutes === 120) return "ساعتان";
  const word = minutes >= 3 && minutes <= 10 ? "دقائق" : "دقيقة";
  return `${formatNumber(minutes)} ${word}`;
}

const weekdayFmt = new Intl.DateTimeFormat(DISPLAY_LOCALE, { weekday: "long", timeZone: TIME_ZONE });
const dateFmt = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const shortDateFmt = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});
const timeFmt = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
});
const hour24Fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE });

/** "الثلاثاء" */
export function formatWeekday(d: Date): string {
  return weekdayFmt.format(d);
}

/** "١٧ نوفمبر ٢٠٢٦" */
export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

/** "١٧ نوفمبر" */
export function formatShortDate(d: Date): string {
  return shortDateFmt.format(d);
}

/** "٤:٠٠ مساءً" / "١٠:٠٠ صباحًا" */
export function formatTime(d: Date): string {
  const hour = Number(hour24Fmt.format(d));
  const period = hour < 12 ? "صباحًا" : "مساءً";
  const clock = timeFmt
    .formatToParts(d)
    .filter((p) => p.type === "hour" || p.type === "minute" || (p.type === "literal" && p.value.includes(":")))
    .map((p) => p.value)
    .join("");
  return `${clock} ${period}`;
}

/** "الثلاثاء ١٧ نوفمبر ٢٠٢٦ · ٤:٠٠ مساءً" */
export function formatDateTime(d: Date): string {
  return `${formatWeekday(d)} ${formatDate(d)} · ${formatTime(d)}`;
}
