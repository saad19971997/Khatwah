import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "b1@khatwah",
    start: new Date("2026-11-17T13:00:00Z"),
    end: new Date("2026-11-17T13:30:00Z"),
    title: "جلسة خطوة مع نورة العتيبي",
    description: "مستشارة تسويق\nرقم الطلب: KH-1, تجربة; نص طويل جدًا يتجاوز خمسة وسبعين بايت في السطر الواحد بلا شك",
    url: "https://meet.google.com/abc-defg-hij",
    now: new Date("2026-11-10T00:00:00Z"),
  });

  it("uses CRLF line endings and UTC timestamps", () => {
    expect(ics).toContain("\r\nDTSTART:20261117T130000Z\r\n");
    expect(ics).toContain("\r\nDTEND:20261117T133000Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
  it("escapes text and folds long lines at 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("DESCRIPTION:مستشارة تسويق\\nرقم الطلب: KH-1\\, تجربة\; نص");
  });
});
