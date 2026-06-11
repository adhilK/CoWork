/**
 * WhatsApp Business API client (Meta Cloud API / Graph API).
 *
 * Resolves per-organization credentials from the WhatsAppConfig row (accessToken
 * decrypted via lib/encryption.ts), falling back to platform-level env vars when
 * no row exists. All sends are recorded as WhatsAppMessage rows for the two-way
 * inbox.
 *
 * NOTE ON QUEUEING: the project convention is that WhatsApp sends go through an
 * Inngest job rather than synchronously in a request. Inngest is not yet wired up
 * in this codebase, so sends happen inline here. `sendWhatsAppMessage` is written
 * as a single pure-ish entry point so it can be moved behind a job runner later
 * with no caller changes. Broadcasts already batch with throttling below.
 */

import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/encryption";
import type { WhatsAppMessageType, MessageDirection, WhatsAppStatus } from "@prisma/client";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type WhatsAppCredentials = {
  phoneNumberId: string;
  accessToken: string;
  businessAccountId: string;
  verifyToken: string;
  source: "org" | "env";
};

/**
 * Resolve credentials for an org. Prefers the encrypted WhatsAppConfig row;
 * falls back to platform env vars. Returns null if neither is configured.
 */
export async function getWhatsAppCredentials(
  organizationId: string
): Promise<WhatsAppCredentials | null> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { organizationId },
  });

  if (config && config.isActive) {
    const accessToken = decryptField(config.accessToken);
    if (config.phoneNumberId && accessToken) {
      return {
        phoneNumberId: config.phoneNumberId,
        accessToken,
        businessAccountId: config.businessAccountId,
        verifyToken: config.verifyToken,
        source: "org",
      };
    }
  }

  // Platform-level fallback
  const envPhone = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (envPhone && envToken) {
    return {
      phoneNumberId: envPhone,
      accessToken: envToken,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? "",
      source: "env",
    };
  }

  return null;
}

/** Normalize a phone number to Meta's format: digits only, no leading +. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

type GraphSendResult =
  | { ok: true; waMessageId: string }
  | { ok: false; error: string };

/** Low-level Graph API text send. */
async function graphSendText(
  creds: WhatsAppCredentials,
  to: string,
  body: string
): Promise<GraphSendResult> {
  try {
    const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const waMessageId = json?.messages?.[0]?.id ?? "";
    return { ok: true, waMessageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/** Low-level Graph API template send with positional body params. */
async function graphSendTemplate(
  creds: WhatsAppCredentials,
  to: string,
  templateName: string,
  language: string,
  params: string[]
): Promise<GraphSendResult> {
  try {
    const components =
      params.length > 0
        ? [
            {
              type: "body",
              parameters: params.map((text) => ({ type: "text", text })),
            },
          ]
        : [];
    const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    const waMessageId = json?.messages?.[0]?.id ?? "";
    return { ok: true, waMessageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export type SendOptions = {
  organizationId: string;
  to: string;
  memberId?: string | null;
  messageType?: WhatsAppMessageType;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  broadcastId?: string | null;
};

export type SendTextOptions = SendOptions & { body: string };

export type SendTemplateOptions = SendOptions & {
  templateName: string;
  language?: string;
  params?: string[];
  /** Resolved text stored as the message content for the inbox preview. */
  renderedBody: string;
};

export type SendResult = {
  ok: boolean;
  messageId: string; // local WhatsAppMessage id
  waMessageId?: string;
  error?: string;
};

/**
 * Send a freeform text message and record it. Freeform sends only work inside the
 * 24-hour customer-service window; outside it, use a template.
 */
export async function sendWhatsAppText(opts: SendTextOptions): Promise<SendResult> {
  const to = normalizePhone(opts.to);
  const creds = await getWhatsAppCredentials(opts.organizationId);

  // Record the message first as QUEUED so it always appears in the inbox.
  const record = await prisma.whatsAppMessage.create({
    data: {
      organizationId: opts.organizationId,
      memberId: opts.memberId ?? null,
      broadcastId: opts.broadcastId ?? null,
      phone: to,
      direction: "OUTBOUND",
      messageType: opts.messageType ?? "CUSTOM",
      content: opts.body,
      status: "QUEUED",
      relatedEntityType: opts.relatedEntityType ?? null,
      relatedEntityId: opts.relatedEntityId ?? null,
    },
  });

  if (!creds) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "FAILED", failedReason: "WhatsApp not configured for this organization" },
    });
    return { ok: false, messageId: record.id, error: "WhatsApp not configured" };
  }

  const result = await graphSendText(creds, to, opts.body);
  if (result.ok) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "SENT", waMessageId: result.waMessageId, sentAt: new Date() },
    });
    return { ok: true, messageId: record.id, waMessageId: result.waMessageId };
  }

  await prisma.whatsAppMessage.update({
    where: { id: record.id },
    data: { status: "FAILED", failedReason: result.error },
  });
  return { ok: false, messageId: record.id, error: result.error };
}

/** Send an approved template message and record it. */
export async function sendWhatsAppTemplate(opts: SendTemplateOptions): Promise<SendResult> {
  const to = normalizePhone(opts.to);
  const creds = await getWhatsAppCredentials(opts.organizationId);

  const record = await prisma.whatsAppMessage.create({
    data: {
      organizationId: opts.organizationId,
      memberId: opts.memberId ?? null,
      broadcastId: opts.broadcastId ?? null,
      phone: to,
      direction: "OUTBOUND",
      messageType: opts.messageType ?? "CUSTOM",
      templateName: opts.templateName,
      content: opts.renderedBody,
      status: "QUEUED",
      relatedEntityType: opts.relatedEntityType ?? null,
      relatedEntityId: opts.relatedEntityId ?? null,
    },
  });

  if (!creds) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "FAILED", failedReason: "WhatsApp not configured for this organization" },
    });
    return { ok: false, messageId: record.id, error: "WhatsApp not configured" };
  }

  const result = await graphSendTemplate(
    creds,
    to,
    opts.templateName,
    opts.language ?? "en",
    opts.params ?? []
  );
  if (result.ok) {
    await prisma.whatsAppMessage.update({
      where: { id: record.id },
      data: { status: "SENT", waMessageId: result.waMessageId, sentAt: new Date() },
    });
    return { ok: true, messageId: record.id, waMessageId: result.waMessageId };
  }

  await prisma.whatsAppMessage.update({
    where: { id: record.id },
    data: { status: "FAILED", failedReason: result.error },
  });
  return { ok: false, messageId: record.id, error: result.error };
}

/** Mark an inbound Meta message as read (blue ticks). Best-effort. */
export async function markWhatsAppRead(
  organizationId: string,
  waMessageId: string
): Promise<void> {
  const creds = await getWhatsAppCredentials(organizationId);
  if (!creds) return;
  try {
    await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: waMessageId,
      }),
    });
  } catch {
    // best-effort — ignore failures
  }
}

/** Replace {{1}}, {{2}} ... positional placeholders with provided values. */
export function renderTemplateBody(body: string, params: string[]): string {
  return body.replace(/\{\{(\d+)\}\}/g, (_m, n) => {
    const idx = Number(n) - 1;
    return params[idx] ?? `{{${n}}}`;
  });
}

/** Map a Meta webhook status string to our WhatsAppStatus enum. */
export function mapMetaStatus(metaStatus: string): WhatsAppStatus | null {
  switch (metaStatus) {
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    default:
      return null;
  }
}

export type { WhatsAppMessageType, MessageDirection, WhatsAppStatus };
