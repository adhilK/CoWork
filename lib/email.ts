import { resend, emailFrom } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

const BRAND = "#15803D";

/**
 * All email sends go through here. They are fire-and-forget and fully
 * guarded: a failing/disabled email must NEVER break the core action
 * (booking, invoicing). If RESEND_API_KEY is missing we no-op.
 */
async function safeSend(args: { to: string; subject: string; html: string }) {
  if (!resend) return; // email disabled (no API key) — no-op, never throws
  try {
    await resend.emails.send({ from: emailFrom, to: args.to, subject: args.subject, html: args.html });
  } catch (err) {
    console.error("[email] send failed:", err instanceof Error ? err.message : err);
  }
}

function shell(orgName: string, title: string, bodyHtml: string) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f8fafc;padding:32px 0;">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="background:linear-gradient(135deg,#0f172a,${BRAND});padding:20px 28px;">
        <span style="color:#fff;font-weight:700;font-size:16px;">${orgName}</span>
      </div>
      <div style="padding:28px;">
        <h1 style="font-size:18px;color:#0f172a;margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #f1f5f9;color:#94a3b8;font-size:12px;">
        Sent by ${orgName} · powered by Maktaby
      </div>
    </div>
  </div>`;
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;font-size:13px;">${label}</td>
    <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

export function sendBookingConfirmation(o: {
  to: string; memberName: string | null; orgName: string;
  resourceName: string; start: Date; end: Date;
  amountCharged: number; creditsUsed: number; currency: string;
  status: string;
}) {
  const payment = o.creditsUsed > 0
    ? `${o.creditsUsed} credit${o.creditsUsed !== 1 ? "s" : ""}`
    : o.amountCharged > 0 ? formatCurrency(o.amountCharged, o.currency) : "Free";
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.memberName ?? "there"}, your booking is ${o.status === "PENDING" ? "pending approval" : "confirmed"}.
    </p>
    <table style="width:100%;border-collapse:collapse;">
      ${row("Space", o.resourceName)}
      ${row("Date", format(o.start, "EEEE d MMM yyyy"))}
      ${row("Time", `${format(o.start, "HH:mm")} – ${format(o.end, "HH:mm")}`)}
      ${row("Payment", payment)}
    </table>`;
  return safeSend({ to: o.to, subject: `Booking ${o.status === "PENDING" ? "received" : "confirmed"} — ${o.resourceName}`, html: shell(o.orgName, "Booking confirmation", body) });
}

export function sendMemberInvite(o: {
  to: string; memberName: string | null; orgName: string; inviteLink: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.memberName ?? "there"} 👋 — you've been invited to join <strong>${o.orgName}</strong> on Maktaby.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;">
      Click the button below to accept your invitation and access your member portal — book desks, view invoices, and more.
    </p>
    <a href="${o.inviteLink}"
       style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Accept invitation →
    </a>
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      This link expires in 24 hours. If you didn't expect this, you can ignore this email.
    </p>`;
  return safeSend({
    to: o.to,
    subject: `You've been invited to ${o.orgName} on Maktaby`,
    html: shell(o.orgName, `Welcome to ${o.orgName}!`, body),
  });
}

export function sendStaffInvite(o: {
  to: string; staffName: string | null; orgName: string; roleLabel: string; inviteLink: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.staffName ?? "there"} 👋 — you've been invited to join the <strong>${o.orgName}</strong> team on Maktaby as
      <strong>${o.roleLabel}</strong>.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;">
      Click below to accept your invitation and access the operator dashboard.
    </p>
    <a href="${o.inviteLink}"
       style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Accept invitation →
    </a>
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      This link expires in 24 hours. If you didn't expect this, you can ignore this email.
    </p>`;
  return safeSend({
    to: o.to,
    subject: `You've been added to ${o.orgName} on Maktaby`,
    html: shell(o.orgName, `Join the ${o.orgName} team`, body),
  });
}

export function sendReminderEmail(o: {
  to: string; memberName: string | null; orgName: string;
  title: string; message: string;
  // optional structured rows (e.g. document type, expiry date)
  rows?: { label: string; value: string }[];
}) {
  const rowsHtml = (o.rows ?? []).map((r) => row(r.label, r.value)).join("");
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.memberName ?? "there"}, ${o.message}
    </p>
    ${rowsHtml ? `<table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">${rowsHtml}</table>` : ""}`;
  return safeSend({ to: o.to, subject: `${o.title} — ${o.orgName}`, html: shell(o.orgName, o.title, body) });
}

// ── Operator lifecycle emails ─────────────────────────────────────────────────

export function sendOperatorWelcome(o: {
  to: string;
  orgName: string;
  ownerName: string | null;
  dashboardUrl: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.ownerName ?? "there"} — welcome to Maktaby! Your coworking space <strong>${o.orgName}</strong> is ready.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      You're on a 14-day free trial with full access to all features. No credit card required yet.
    </p>
    <a href="${o.dashboardUrl}"
       style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Go to your dashboard →
    </a>
    <p style="color:#94a3b8;font-size:12px;margin:0;">
      Questions? Reply to this email — we're here to help.
    </p>`;
  return safeSend({
    to: o.to,
    subject: `Welcome to Maktaby — your trial has started`,
    html: shell(o.orgName, `Welcome, ${o.ownerName ?? "there"}!`, body),
  });
}

export function sendTrialEndingWarning(o: {
  to: string;
  orgName: string;
  ownerName: string | null;
  daysLeft: number;
  billingUrl: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.ownerName ?? "there"} — your Maktaby trial for <strong>${o.orgName}</strong> ends in
      <strong>${o.daysLeft} day${o.daysLeft !== 1 ? "s" : ""}</strong>.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;">
      Choose a plan now to keep uninterrupted access for you and your members.
    </p>
    <a href="${o.billingUrl}"
       style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Choose a plan →
    </a>`;
  return safeSend({
    to: o.to,
    subject: `Your Maktaby trial ends in ${o.daysLeft} day${o.daysLeft !== 1 ? "s" : ""}`,
    html: shell(o.orgName, "Trial ending soon", body),
  });
}

export function sendTrialExpired(o: {
  to: string;
  orgName: string;
  ownerName: string | null;
  billingUrl: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.ownerName ?? "there"} — your free trial for <strong>${o.orgName}</strong> has ended.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;">
      Your data is safe. Choose a plan to restore access in seconds — your members and bookings are waiting.
    </p>
    <a href="${o.billingUrl}"
       style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Upgrade to continue →
    </a>`;
  return safeSend({
    to: o.to,
    subject: `Your Maktaby trial has ended — upgrade to continue`,
    html: shell(o.orgName, "Trial ended", body),
  });
}

export function sendPaymentFailed(o: {
  to: string;
  orgName: string;
  ownerName: string | null;
  billingUrl: string;
}) {
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.ownerName ?? "there"} — we couldn't process your subscription payment for <strong>${o.orgName}</strong>.
    </p>
    <p style="color:#475569;font-size:14px;margin:0 0 24px;">
      Please update your payment method to keep your account active and avoid any disruption for your members.
    </p>
    <a href="${o.billingUrl}"
       style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
      Update payment method →
    </a>`;
  return safeSend({
    to: o.to,
    subject: `Action required — payment failed for ${o.orgName}`,
    html: shell(o.orgName, "Payment failed", body),
  });
}

export function sendInvoiceEmail(o: {
  to: string; memberName: string | null; orgName: string;
  invoiceNumber: string; amount: number; currency: string; dueDate: Date;
  lineItems: { description: string; total: number }[];
  // VAT breakdown (optional — omitted for legacy/zero-VAT invoices)
  subtotal?: number; vatAmount?: number; vatRate?: number;
}) {
  const items = o.lineItems.map((li) =>
    `<tr>
      <td style="padding:6px 0;color:#475569;font-size:13px;">${li.description}</td>
      <td style="padding:6px 0;color:#0f172a;font-size:13px;text-align:right;">${formatCurrency(li.total, o.currency)}</td>
    </tr>`).join("");
  // Show a Subtotal + VAT breakdown when VAT applies, otherwise just the total.
  const vatPct = o.vatRate ? `${(o.vatRate * 100).toFixed(o.vatRate * 100 % 1 === 0 ? 0 : 2)}%` : "";
  const breakdown = o.vatAmount && o.vatAmount > 0
    ? `${row("Subtotal", formatCurrency(o.subtotal ?? o.amount - o.vatAmount, o.currency))}
       ${row(`VAT (${vatPct})`, formatCurrency(o.vatAmount, o.currency))}`
    : "";
  const body = `
    <p style="color:#475569;font-size:14px;margin:0 0 18px;">
      Hi ${o.memberName ?? "there"}, here's invoice <strong>${o.invoiceNumber}</strong> from ${o.orgName}.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">${items}</table>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
      ${breakdown}
      ${row("Total due", formatCurrency(o.amount, o.currency))}
      ${row("Due date", format(o.dueDate, "d MMM yyyy"))}
    </table>`;
  return safeSend({ to: o.to, subject: `Invoice ${o.invoiceNumber} — ${formatCurrency(o.amount, o.currency)} due`, html: shell(o.orgName, "New invoice", body) });
}
