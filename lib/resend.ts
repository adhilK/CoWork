import { Resend } from "resend";

/**
 * Resend client. Intentionally does NOT throw when the key is missing —
 * a missing/disabled email config must never crash routes that import
 * this (bookings, invoices). When unset, `resend` is null and all sends
 * are skipped (see lib/email.ts).
 */
export const resend: Resend | null = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const emailFrom =
  process.env.EMAIL_FROM ?? "CoWork Pro <noreply@coworkpro.io>";
