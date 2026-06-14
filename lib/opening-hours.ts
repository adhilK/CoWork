/**
 * Opening-hours validation for bookings.
 *
 * A Location stores `openingHours` as JSON keyed by short weekday
 * (`mon`..`sun`), each `{ open: "HH:MM", close: "HH:MM", closed: boolean }`,
 * expressed in the location's local timezone. Bookings are stored in UTC, so
 * we resolve the booking's local weekday + minutes-of-day in that timezone via
 * `Intl.DateTimeFormat` (no extra dependency) before comparing.
 *
 * Returns `null` when the booking is within hours OR when hours aren't
 * configured (we don't block orgs that never set hours). Returns a
 * human-readable message when the booking falls on a closed day or outside the
 * open window.
 */

export type DayHours = { open?: string; close?: string; closed?: boolean };
export type OpeningHours = Record<string, DayHours>;

const DAY_LABELS: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

function hhmmToMinutes(s?: string): number | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const min = parseInt(m[2]!, 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;
  return h * 60 + min;
}

/** Local weekday key (mon..sun) and minutes-of-day for a UTC date in a tz. */
function localParts(date: Date, timeZone: string): { dayKey: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  let hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  if (hour === "24") hour = "00"; // some environments emit 24 for midnight
  return {
    dayKey: weekday.toLowerCase().slice(0, 3),
    minutes: parseInt(hour, 10) * 60 + parseInt(minute, 10),
  };
}

/**
 * Validate a booking window against a location's opening hours.
 * @returns error message string, or `null` if allowed.
 */
export function validateWithinOpeningHours(
  openingHours: unknown,
  timeZone: string | null | undefined,
  start: Date,
  end: Date,
): string | null {
  if (!openingHours || typeof openingHours !== "object") return null;
  const oh = openingHours as OpeningHours;
  const tz = timeZone || "Asia/Dubai";

  const s = localParts(start, tz);
  const cfg = oh[s.dayKey];
  if (!cfg) return null; // day not configured → don't block

  const label = DAY_LABELS[s.dayKey] ?? s.dayKey;
  if (cfg.closed) {
    return `The space is closed on ${label}. Please choose a day it's open.`;
  }

  const open = hhmmToMinutes(cfg.open);
  const close = hhmmToMinutes(cfg.close);
  if (open == null || close == null) return null; // hours malformed → don't block

  if (s.minutes < open) {
    return `Bookings on ${label} can't start before ${cfg.open}.`;
  }

  // End time in the same local frame. If it lands on a later local day the
  // booking crosses midnight — measure relative to the start day.
  const e = localParts(end, tz);
  const endMinutes = e.dayKey === s.dayKey ? e.minutes : e.minutes + 24 * 60;
  if (endMinutes > close) {
    return `Bookings on ${label} must end by ${cfg.close}.`;
  }

  return null;
}
