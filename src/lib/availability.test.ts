import { describe, expect, it } from "vitest";
import { addLocalDays, generateSlots, groupByDate, weekdayOf } from "./availability";

// Tuesday 2026-11-17 08:00 Riyadh (05:00Z)
const now = new Date("2026-11-17T05:00:00Z");
const base = { blockedDates: [], taken: [], now, leadMinutes: 0, days: 7 };

describe("calendar helpers", () => {
  it("weekday and day arithmetic", () => {
    expect(weekdayOf("2026-11-17")).toBe(2); // Tuesday
    expect(addLocalDays("2026-11-30", 1)).toBe("2026-12-01");
  });
});

describe("generateSlots", () => {
  it("expands a weekly window into back-to-back slots in Riyadh time", () => {
    const slots = generateSlots({ ...base, rules: [{ weekday: 2, startTime: "16:00", endTime: "17:30" }], durationMin: 30 });
    const today = slots.filter((s) => s.localDate === "2026-11-17");
    expect(today.map((s) => s.startsAt.toISOString())).toEqual([
      "2026-11-17T13:00:00.000Z",
      "2026-11-17T13:30:00.000Z",
      "2026-11-17T14:00:00.000Z",
    ]);
    expect(today[0].endsAt.toISOString()).toBe("2026-11-17T13:30:00.000Z");
  });

  it("drops a trailing partial slot that would overrun the window", () => {
    const slots = generateSlots({ ...base, rules: [{ weekday: 2, startTime: "19:30", endTime: "21:00" }], durationMin: 45 });
    expect(slots.filter((s) => s.localDate === "2026-11-17")).toHaveLength(2);
    const short = generateSlots({ ...base, rules: [{ weekday: 2, startTime: "19:30", endTime: "20:59" }], durationMin: 45 });
    expect(short.filter((s) => s.localDate === "2026-11-17")).toHaveLength(1);
  });

  it("respects the minimum lead time", () => {
    const rules = [{ weekday: 2, startTime: "09:00", endTime: "12:00" }];
    // now = 08:00 Riyadh; with 2h lead the 09:00 and 09:30 slots are gone
    const slots = generateSlots({ ...base, rules, durationMin: 30, leadMinutes: 120 });
    expect(slots.find((s) => s.localDate === "2026-11-17")?.startsAt.toISOString()).toBe("2026-11-17T07:00:00.000Z");
  });

  it("skips blocked dates and the booking horizon", () => {
    const rules = [{ weekday: 2, startTime: "16:00", endTime: "17:00" }];
    const slots = generateSlots({ ...base, rules, durationMin: 60, blockedDates: ["2026-11-17"], days: 14 });
    expect(slots.map((s) => s.localDate)).toEqual(["2026-11-24", "2026-12-01"]);
    const shortHorizon = generateSlots({ ...base, rules, durationMin: 60, days: 6 });
    expect(shortHorizon.map((s) => s.localDate)).toEqual(["2026-11-17"]);
  });

  it("removes slots overlapping taken intervals (even with a different duration)", () => {
    const rules = [{ weekday: 2, startTime: "16:00", endTime: "18:00" }];
    const taken = [{ startsAt: new Date("2026-11-17T13:15:00Z"), endsAt: new Date("2026-11-17T14:00:00Z") }];
    const slots = generateSlots({ ...base, rules, durationMin: 30, taken });
    expect(slots.filter((s) => s.localDate === "2026-11-17").map((s) => s.startsAt.toISOString())).toEqual([
      "2026-11-17T14:00:00.000Z",
      "2026-11-17T14:30:00.000Z",
    ]);
  });

  it("dedupes overlapping rules and sorts", () => {
    const rules = [
      { weekday: 3, startTime: "10:00", endTime: "11:00" },
      { weekday: 2, startTime: "16:00", endTime: "17:00" },
      { weekday: 2, startTime: "16:00", endTime: "17:00" },
    ];
    // days: 6 → today plus six days (the next Tuesday falls outside)
    const slots = generateSlots({ ...base, rules, durationMin: 60, days: 6 });
    expect(slots.map((s) => s.localDate)).toEqual(["2026-11-17", "2026-11-18"]);
    expect(groupByDate(slots).map((g) => g.localDate)).toEqual(["2026-11-17", "2026-11-18"]);
  });

  it("uses the local date in Riyadh when UTC is still the previous day", () => {
    // 2026-11-16 22:00Z = 2026-11-17 01:00 Riyadh (Tuesday)
    const slots = generateSlots({
      ...base,
      now: new Date("2026-11-16T22:00:00Z"),
      rules: [{ weekday: 2, startTime: "10:00", endTime: "11:00" }],
      durationMin: 60,
      days: 0,
    });
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual(["2026-11-17T07:00:00.000Z"]);
  });
});
