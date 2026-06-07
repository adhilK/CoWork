/**
 * Google Calendar integration helpers.
 *
 * Used for:
 *  - Generating the OAuth consent URL (connect flow)
 *  - Exchanging an auth code for tokens (callback)
 *  - Creating a calendar event when a booking is confirmed
 *  - Deleting a calendar event when a booking is cancelled
 */

import { google } from "googleapis";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`;

export function getOAuthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

/** Returns the URL to redirect the user to for calendar permission. */
export function getCalendarAuthUrl(state: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",       // get refresh token
    prompt: "consent",            // always ask so we get the refresh token
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
    ],
    state,                        // encode userId so the callback knows who to save to
  });
}

/** Exchange an auth code for tokens. Returns { accessToken, refreshToken }. */
export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return {
    accessToken: tokens.access_token ?? null,
    refreshToken: tokens.refresh_token ?? null,
  };
}

/** Build an authenticated calendar client from a stored refresh token. */
function calendarClient(refreshToken: string) {
  const auth = getOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

export type CalendarEventInput = {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  resourceName: string;
  orgName: string;
};

/**
 * Creates a Google Calendar event and returns the event ID.
 * Returns null silently if anything fails (never block bookings on Calendar errors).
 */
export async function createCalendarEvent(
  refreshToken: string,
  input: CalendarEventInput
): Promise<string | null> {
  try {
    const cal = calendarClient(refreshToken);
    const res = await cal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `${input.title} @ ${input.resourceName}`,
        description: [
          `Space: ${input.resourceName}`,
          `Location: ${input.orgName}`,
          input.description ? `\nNotes: ${input.description}` : "",
        ].filter(Boolean).join("\n"),
        start: {
          dateTime: input.startTime.toISOString(),
          timeZone: input.timezone,
        },
        end: {
          dateTime: input.endTime.toISOString(),
          timeZone: input.timezone,
        },
        source: {
          title: "CoWork Pro",
          url: process.env.NEXT_PUBLIC_APP_URL ?? "https://coworkpro.vercel.app",
        },
      },
    });
    return res.data.id ?? null;
  } catch {
    return null; // never block booking creation
  }
}

/**
 * Deletes a Google Calendar event by ID.
 * Fails silently — the booking cancellation still succeeds even if this errors.
 */
export async function deleteCalendarEvent(
  refreshToken: string,
  eventId: string
): Promise<void> {
  try {
    const cal = calendarClient(refreshToken);
    await cal.events.delete({ calendarId: "primary", eventId });
  } catch {
    // ignore — event may already be deleted or token may have been revoked
  }
}
