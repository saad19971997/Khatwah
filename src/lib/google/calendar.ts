import "server-only";
import { JWT, OAuth2Client } from "google-auth-library";

/**
 * Creates Google Calendar events with an auto-generated Google Meet link on
 * the platform's calendar, inviting the client and the consultant.
 *
 * GOOGLE_AUTH_MODE:
 *   none            – disabled (bookings confirm without a Meet link)
 *   oauth           – a Google account's OAuth client + refresh token
 *   service_account – Workspace service account with domain-wide delegation,
 *                     impersonating GOOGLE_IMPERSONATE_USER
 */

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function isCalendarEnabled(): boolean {
  const mode = process.env.GOOGLE_AUTH_MODE;
  return mode === "oauth" || mode === "service_account";
}

async function accessToken(): Promise<string> {
  const mode = process.env.GOOGLE_AUTH_MODE;
  if (mode === "oauth") {
    const c = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    c.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const { token } = await c.getAccessToken();
    if (!token) throw new Error("Google OAuth: no access token");
    return token;
  }
  if (mode === "service_account") {
    const jwt = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "").replace(/\\n/g, "\n"),
      scopes: SCOPES,
      subject: process.env.GOOGLE_IMPERSONATE_USER || undefined,
    });
    const { token } = await jwt.getAccessToken();
    if (!token) throw new Error("Google service account: no access token");
    return token;
  }
  throw new Error("Google Calendar is not configured (GOOGLE_AUTH_MODE)");
}

export type MeetEvent = { eventId: string; meetUrl: string | null; htmlLink?: string };

export async function createMeetEvent(e: {
  /** Stable per booking: makes retries idempotent on Google's side. */
  requestId: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendees: { email: string; displayName?: string }[];
}): Promise<MeetEvent> {
  const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || "primary");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: e.summary,
      description: e.description,
      start: { dateTime: e.start.toISOString(), timeZone: "Asia/Riyadh" },
      end: { dateTime: e.end.toISOString(), timeZone: "Asia/Riyadh" },
      attendees: e.attendees,
      guestsCanModify: false,
      conferenceData: {
        createRequest: { requestId: e.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
      reminders: { useDefault: false, overrides: [{ method: "email", minutes: 60 }, { method: "popup", minutes: 15 }] },
    }),
  });
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
    conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  };
  const meetUrl =
    data.hangoutLink ?? data.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? null;
  return { eventId: data.id, meetUrl, htmlLink: data.htmlLink };
}
