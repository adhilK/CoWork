/**
 * Daily reminders — shared logic used by the Inngest scheduled function and the
 * /api/cron/daily-reminders fallback route.
 *
 * Scans for upcoming expiries and overdue items, then notifies the member via
 * WhatsApp (queued) and email. Each reminder is idempotent: it won't be sent
 * again if an equivalent WhatsApp message already went out within the dedupe
 * window (default 14 days), so running daily is safe.
 *
 * Covered:
 *   - Visa / residency expiry            (Member.visaExpiry)
 *   - Document expiry                    (Document.expiryDate)
 *   - Virtual office renewal             (VirtualOfficeSubscription.renewalDate)
 *   - Trade-license expiry               (VirtualOfficeSubscription.licenseExpiry)
 *   - Overdue document requests          (DocumentRequest.dueDate)
 */

import { prisma } from "@/lib/prisma";
import { dispatchWhatsAppText } from "@/lib/jobs";
import { sendReminderEmail } from "@/lib/email";
import { decryptField } from "@/lib/encryption";
import { documentTypeLabel } from "@/lib/document-meta";

const REMINDER_DAYS = Number(process.env.REMINDER_DAYS ?? 30);
const DEDUPE_DAYS = Number(process.env.REMINDER_DEDUPE_DAYS ?? 14);

export type ReminderResult = {
  visaExpiry: number;
  documentExpiry: number;
  virtualOfficeRenewal: number;
  licenseExpiry: number;
  overdueRequests: number;
  total: number;
};

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

/** Has an equivalent reminder already gone out recently? */
async function alreadyReminded(
  organizationId: string,
  messageType: string,
  relatedEntityType: string,
  relatedEntityId: string
): Promise<boolean> {
  const since = new Date(Date.now() - DEDUPE_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.whatsAppMessage.findFirst({
    where: {
      organizationId,
      direction: "OUTBOUND",
      messageType: messageType as any,
      relatedEntityType,
      relatedEntityId,
      sentAt: { gte: since },
    },
    select: { id: true },
  });
  return !!existing;
}

async function notify(opts: {
  organizationId: string;
  orgName: string;
  memberId: string;
  memberName: string | null;
  whatsAppNumber: string | null;
  email: string | null;
  messageType: string;
  relatedEntityType: string;
  relatedEntityId: string;
  waBody: string;
  emailTitle: string;
  emailMessage: string;
  emailRows?: { label: string; value: string }[];
}): Promise<boolean> {
  if (await alreadyReminded(opts.organizationId, opts.messageType, opts.relatedEntityType, opts.relatedEntityId)) {
    return false;
  }
  if (opts.whatsAppNumber) {
    await dispatchWhatsAppText({
      organizationId: opts.organizationId,
      to: opts.whatsAppNumber,
      memberId: opts.memberId,
      messageType: opts.messageType,
      relatedEntityType: opts.relatedEntityType,
      relatedEntityId: opts.relatedEntityId,
      body: opts.waBody,
    });
  }
  if (opts.email) {
    void sendReminderEmail({
      to: opts.email,
      memberName: opts.memberName,
      orgName: opts.orgName,
      title: opts.emailTitle,
      message: opts.emailMessage,
      rows: opts.emailRows,
    });
  }
  return true;
}

export async function runDailyReminders(): Promise<ReminderResult> {
  const now = new Date();
  const horizon = new Date(now.getTime() + REMINDER_DAYS * 24 * 60 * 60 * 1000);
  const result: ReminderResult = {
    visaExpiry: 0, documentExpiry: 0, virtualOfficeRenewal: 0,
    licenseExpiry: 0, overdueRequests: 0, total: 0,
  };

  // ── 1. Visa / residency expiry ────────────────────────────────────────────
  const visaMembers = await prisma.member.findMany({
    where: { deletedAt: null, status: "ACTIVE", visaExpiry: { not: null, gte: now, lte: horizon } },
    include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } },
  });
  for (const m of visaMembers) {
    const days = daysUntil(m.visaExpiry!);
    const sent = await notify({
      organizationId: m.organizationId, orgName: m.organization.name,
      memberId: m.id, memberName: m.user.name, whatsAppNumber: m.whatsAppNumber, email: m.user.email,
      messageType: "RENEWAL_REMINDER", relatedEntityType: "visa", relatedEntityId: m.id,
      waBody: `Reminder: your visa/residency expires in ${days} day${days !== 1 ? "s" : ""} (${m.visaExpiry!.toLocaleDateString("en-GB")}). Please start your renewal soon.`,
      emailTitle: "Visa expiry reminder",
      emailMessage: `your visa/residency permit expires in ${days} day${days !== 1 ? "s" : ""}. Please begin the renewal process.`,
      emailRows: [{ label: "Expiry date", value: m.visaExpiry!.toLocaleDateString("en-GB") }],
    });
    if (sent) result.visaExpiry++;
  }

  // ── 2. Document expiry ────────────────────────────────────────────────────
  const docs = await prisma.document.findMany({
    where: { deletedAt: null, expiryDate: { not: null, gte: now, lte: horizon } },
    include: {
      member: { include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } } },
    },
  });
  for (const d of docs) {
    const days = daysUntil(d.expiryDate!);
    const label = documentTypeLabel(d.documentType);
    const sent = await notify({
      organizationId: d.organizationId, orgName: d.member.organization.name,
      memberId: d.memberId, memberName: d.member.user.name,
      whatsAppNumber: d.member.whatsAppNumber, email: d.member.user.email,
      messageType: "DOCUMENT_EXPIRY", relatedEntityType: "document", relatedEntityId: d.id,
      waBody: `Reminder: your ${label} expires in ${days} day${days !== 1 ? "s" : ""} (${d.expiryDate!.toLocaleDateString("en-GB")}). Please upload a renewed copy.`,
      emailTitle: `${label} expiry reminder`,
      emailMessage: `your ${label} expires in ${days} day${days !== 1 ? "s" : ""}. Please provide an updated copy.`,
      emailRows: [
        { label: "Document", value: label },
        { label: "Expiry date", value: d.expiryDate!.toLocaleDateString("en-GB") },
        ...(decryptField(d.documentNumber) ? [{ label: "Number", value: decryptField(d.documentNumber)! }] : []),
      ],
    });
    if (sent) result.documentExpiry++;
  }

  // ── 3. Virtual office renewal + 4. license expiry ─────────────────────────
  const subs = await prisma.virtualOfficeSubscription.findMany({
    where: {
      deletedAt: null,
      status: { in: ["ACTIVE", "PENDING_RENEWAL"] },
      OR: [
        { renewalDate: { not: null, gte: now, lte: horizon } },
        { licenseExpiry: { not: null, gte: now, lte: horizon } },
      ],
    },
    include: {
      member: { include: { user: { select: { name: true, email: true } } } },
      organization: { select: { name: true } },
    },
  });
  for (const s of subs) {
    // Renewal
    if (s.renewalDate && s.renewalDate >= now && s.renewalDate <= horizon) {
      const days = daysUntil(s.renewalDate);
      const sent = await notify({
        organizationId: s.organizationId, orgName: s.organization.name,
        memberId: s.memberId, memberName: s.member.user.name,
        whatsAppNumber: s.member.whatsAppNumber, email: s.member.user.email,
        messageType: "RENEWAL_REMINDER", relatedEntityType: "virtual_office", relatedEntityId: s.id,
        waBody: `Reminder: the virtual office subscription for ${s.companyName} renews in ${days} day${days !== 1 ? "s" : ""} (${s.renewalDate.toLocaleDateString("en-GB")}).`,
        emailTitle: "Virtual office renewal",
        emailMessage: `your virtual office subscription for ${s.companyName} is due for renewal in ${days} day${days !== 1 ? "s" : ""}.`,
        emailRows: [
          { label: "Company", value: s.companyName },
          { label: "Renewal date", value: s.renewalDate.toLocaleDateString("en-GB") },
        ],
      });
      if (sent) result.virtualOfficeRenewal++;
      // Flip ACTIVE → PENDING_RENEWAL so it surfaces in the dashboard.
      if (s.status === "ACTIVE") {
        await prisma.virtualOfficeSubscription.update({ where: { id: s.id }, data: { status: "PENDING_RENEWAL" } });
      }
    }
    // License expiry
    if (s.licenseExpiry && s.licenseExpiry >= now && s.licenseExpiry <= horizon) {
      const days = daysUntil(s.licenseExpiry);
      const sent = await notify({
        organizationId: s.organizationId, orgName: s.organization.name,
        memberId: s.memberId, memberName: s.member.user.name,
        whatsAppNumber: s.member.whatsAppNumber, email: s.member.user.email,
        messageType: "RENEWAL_REMINDER", relatedEntityType: "license", relatedEntityId: s.id,
        waBody: `Reminder: the trade license for ${s.companyName} expires in ${days} day${days !== 1 ? "s" : ""} (${s.licenseExpiry.toLocaleDateString("en-GB")}).`,
        emailTitle: "Trade license expiry",
        emailMessage: `the trade license for ${s.companyName} expires in ${days} day${days !== 1 ? "s" : ""}.`,
        emailRows: [
          { label: "Company", value: s.companyName },
          { label: "License expiry", value: s.licenseExpiry.toLocaleDateString("en-GB") },
        ],
      });
      if (sent) result.licenseExpiry++;
    }
  }

  // ── 5. Overdue document requests ──────────────────────────────────────────
  const overdue = await prisma.documentRequest.findMany({
    where: { deletedAt: null, status: "PENDING", dueDate: { not: null, lt: now } },
    include: {
      member: { include: { user: { select: { name: true, email: true } }, organization: { select: { name: true } } } },
    },
  });
  for (const r of overdue) {
    // Mark it overdue
    await prisma.documentRequest.update({ where: { id: r.id }, data: { status: "OVERDUE" } });
    const label = documentTypeLabel(r.documentType);
    const sent = await notify({
      organizationId: r.organizationId, orgName: r.member.organization.name,
      memberId: r.memberId, memberName: r.member.user.name,
      whatsAppNumber: r.member.whatsAppNumber, email: r.member.user.email,
      messageType: "DOCUMENT_EXPIRY", relatedEntityType: "document_request", relatedEntityId: r.id,
      waBody: `Reminder: we're still waiting for your ${label}${r.dueDate ? ` (was due ${r.dueDate.toLocaleDateString("en-GB")})` : ""}. Please upload it at your earliest convenience.`,
      emailTitle: `Document overdue: ${label}`,
      emailMessage: `we're still waiting for your ${label}. Please upload it via your member portal.`,
      emailRows: [{ label: "Document", value: label }, ...(r.dueDate ? [{ label: "Was due", value: r.dueDate.toLocaleDateString("en-GB") }] : [])],
    });
    if (sent) result.overdueRequests++;
  }

  result.total =
    result.visaExpiry + result.documentExpiry + result.virtualOfficeRenewal +
    result.licenseExpiry + result.overdueRequests;
  return result;
}
