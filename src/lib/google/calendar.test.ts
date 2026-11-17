import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    setCredentials() {}
    async getAccessToken() {
      return { token: "test-token" };
    }
  },
  JWT: class {
    async getAccessToken() {
      return { token: "test-token" };
    }
  },
}));

describe("createMeetEvent", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_AUTH_MODE", "oauth");
    vi.stubEnv("GOOGLE_CALENDAR_ID", "team@example.com");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("requests a Meet conference and returns its link", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ id: "evt1", hangoutLink: "https://meet.google.com/abc-defg-hij" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createMeetEvent, isCalendarEnabled } = await import("./calendar");
    expect(isCalendarEnabled()).toBe(true);

    const res = await createMeetEvent({
      requestId: "booking-1",
      summary: "s",
      description: "d",
      start: new Date("2026-11-17T13:00:00Z"),
      end: new Date("2026-11-17T13:30:00Z"),
      attendees: [{ email: "a@example.com" }],
    });
    expect(res).toEqual({ eventId: "evt1", meetUrl: "https://meet.google.com/abc-defg-hij", htmlLink: undefined });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/calendars/team%40example.com/events?conferenceDataVersion=1&sendUpdates=all");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
    const body = JSON.parse(String(init.body));
    expect(body.conferenceData.createRequest).toEqual({ requestId: "booking-1", conferenceSolutionKey: { type: "hangoutsMeet" } });
  });

  it("surfaces API errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 403 })));
    const { createMeetEvent } = await import("./calendar");
    await expect(
      createMeetEvent({ requestId: "x", summary: "s", description: "d", start: new Date(), end: new Date(), attendees: [] }),
    ).rejects.toThrow(/403/);
  });
});
