import { describe, expect, it } from "vitest";
import { validateBooking } from "./validation";

describe("validateBooking", () => {
  it("reports every missing field with the prototype's error keys", () => {
    expect(validateBooking({})).toEqual({ slot: "slotRequired", name: "nameRequired", email: "emailRequired" });
  });
  it("rejects malformed emails (as in the prototype's sara@mail example)", () => {
    expect(validateBooking({ slot: "2026-11-17T13:00:00.000Z", name: "سارة", email: "sara@mail" })).toEqual({
      email: "emailInvalid",
    });
  });
  it("accepts a complete booking", () => {
    expect(
      validateBooking({ slot: "2026-11-17T13:00:00.000Z", name: " سارة ", email: "sara@example.com", topic: "" }),
    ).toEqual({});
  });
  it("limits topic length and rejects whitespace-only names", () => {
    expect(validateBooking({ slot: "2026-11-17T13:00:00.000Z", name: "   ", email: "a@b.co", topic: "x".repeat(1001) })).toEqual({
      name: "nameRequired",
      topic: "topicTooLong",
    });
  });
});
