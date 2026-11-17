import { describe, expect, it } from "vitest";
import { formatDate, formatDuration, formatPrice, formatTime, formatWeekday, payLabel, riyalWord, toArabicDigits } from "./format";

describe("riyalWord (Arabic number agreement)", () => {
  it.each([
    [1, "ريال"],
    [2, "ريالان"],
    [3, "ريالات"],
    [10, "ريالات"],
    [11, "ريالًا"],
    [99, "ريالًا"],
    [100, "ريال"],
    [150, "ريالًا"],
    [200, "ريال"],
    [250, "ريالًا"],
    [1000, "ريال"],
    [1005, "ريالات"],
  ])("%i → %s", (n, word) => expect(riyalWord(n)).toBe(word));
});

describe("prices", () => {
  it("formats prices and pay labels like the prototype", () => {
    expect(formatPrice(15000)).toBe("١٥٠ ريال سعودي");
    expect(payLabel(15000)).toBe("ادفع ١٥٠ ريالًا");
    expect(payLabel(20000)).toBe("ادفع ٢٠٠ ريال");
    expect(payLabel(25000)).toBe("ادفع ٢٥٠ ريالًا");
  });
  it("keeps halalas", () => {
    expect(formatPrice(14950)).toBe("١٤٩٫٥ ريال سعودي");
  });
});

describe("dates and times in Asia/Riyadh", () => {
  // 2026-11-17 13:00Z = 16:00 Riyadh (UTC+3)
  const d = new Date("2026-11-17T13:00:00Z");
  it("weekday, date, time", () => {
    expect(formatWeekday(d)).toBe("الثلاثاء");
    expect(formatDate(d)).toBe("١٧ نوفمبر ٢٠٢٦");
    expect(formatTime(d)).toBe("٤:٠٠ مساءً");
  });
  it("morning and the day boundary are in Riyadh time, not UTC", () => {
    expect(formatTime(new Date("2026-11-19T07:00:00Z"))).toBe("١٠:٠٠ صباحًا");
    // 22:30Z on the 17th is already the 18th in Riyadh
    expect(formatDate(new Date("2026-11-17T22:30:00Z"))).toBe("١٨ نوفمبر ٢٠٢٦");
    expect(formatTime(new Date("2026-11-17T22:30:00Z"))).toBe("١:٣٠ صباحًا");
  });
  it("noon is مساءً, midnight is صباحًا", () => {
    expect(formatTime(new Date("2026-11-17T09:00:00Z"))).toBe("١٢:٠٠ مساءً");
    expect(formatTime(new Date("2026-11-17T21:00:00Z"))).toBe("١٢:٠٠ صباحًا");
  });
});

describe("misc", () => {
  it("durations", () => {
    expect(formatDuration(30)).toBe("٣٠ دقيقة");
    expect(formatDuration(45)).toBe("٤٥ دقيقة");
    expect(formatDuration(60)).toBe("ساعة");
  });
  it("arabic digits", () => {
    expect(toArabicDigits("KH-123")).toBe("KH-١٢٣");
  });
});
