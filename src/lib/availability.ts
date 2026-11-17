import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { BOOKING_WINDOW_DAYS, MIN_LEAD_MINUTES, TIME_ZONE } from "./config";

export type Rule = { weekday: number; startTime: string; endTime: string };
export type Interval = { startsAt: Date; endsAt: Date };
export type Slot = Interval & { /** local "YYYY-MM-DD" */ localDate: string };

export type SlotInput = {
  rules: Rule[];
  /** Local dates ("YYYY-MM-DD") that are fully blocked. */
  blockedDates: string[];
  durationMin: number;
  /** Intervals already taken (confirmed or currently held bookings). */
  taken: Interval[];
  now: Date;
  days?: number;
  leadMinutes?: number;
  timeZone?: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Adds `n` calendar days to a "YYYY-MM-DD" string. */
export function addLocalDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday) of a "YYYY-MM-DD" calendar date. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

/**
 * Expands weekly rules into concrete bookable slots.
 *
 * Pure function: everything time-dependent comes in through `now`, so it is
 * deterministic in tests. Slots are aligned to each rule's start time and
 * stepped by the session duration; a slot must end within its window.
 */
export function generateSlots(input: SlotInput): Slot[] {
  const tz = input.timeZone ?? TIME_ZONE;
  const days = input.days ?? BOOKING_WINDOW_DAYS;
  const lead = input.leadMinutes ?? MIN_LEAD_MINUTES;
  const earliest = new Date(input.now.getTime() + lead * 60_000);
  const blocked = new Set(input.blockedDates);
  const today = formatInTimeZone(input.now, tz, "yyyy-MM-dd");
  const out: Slot[] = [];

  for (let i = 0; i <= days; i++) {
    const localDate = addLocalDays(today, i);
    if (blocked.has(localDate)) continue;
    const weekday = weekdayOf(localDate);

    for (const rule of input.rules) {
      if (rule.weekday !== weekday) continue;
      const end = toMinutes(rule.endTime);
      for (let m = toMinutes(rule.startTime); m + input.durationMin <= end; m += input.durationMin) {
        const startsAt = fromZonedTime(`${localDate}T${pad(Math.floor(m / 60))}:${pad(m % 60)}:00`, tz);
        const endsAt = new Date(startsAt.getTime() + input.durationMin * 60_000);
        if (startsAt < earliest) continue;
        const slot = { startsAt, endsAt, localDate };
        if (input.taken.some((t) => overlaps(slot, t))) continue;
        out.push(slot);
      }
    }
  }

  // Rules on the same weekday may be listed in any order; dedupe & sort.
  const seen = new Set<number>();
  return out
    .filter((s) => (seen.has(s.startsAt.getTime()) ? false : (seen.add(s.startsAt.getTime()), true)))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

/** Groups slots by local date, preserving order. */
export function groupByDate<T extends { localDate: string }>(slots: T[]): { localDate: string; slots: T[] }[] {
  const groups: { localDate: string; slots: T[] }[] = [];
  for (const s of slots) {
    const last = groups[groups.length - 1];
    if (last && last.localDate === s.localDate) last.slots.push(s);
    else groups.push({ localDate: s.localDate, slots: [s] });
  }
  return groups;
}
