/**
 * Job dispatch helpers.
 *
 * `enqueue` sends an event to Inngest when it is configured; otherwise it
 * returns false so callers can fall back to running inline. This lets the app
 * work identically whether or not Inngest is connected — the queue is an
 * optimisation, never a hard dependency.
 */

import { inngest, type CoworkEvents } from "@/lib/inngest";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp";

/** True when Inngest is wired up (event key present). */
export function jobsEnabled(): boolean {
  return !!process.env.INNGEST_EVENT_KEY;
}

/**
 * Send an event to Inngest. Returns true if it was accepted, false if Inngest
 * is not configured (caller should handle the work inline).
 */
export async function enqueue<K extends keyof CoworkEvents>(
  name: K,
  data: CoworkEvents[K]["data"]
): Promise<boolean> {
  if (!jobsEnabled()) return false;
  try {
    await inngest.send({ name: name as string, data });
    return true;
  } catch (err) {
    console.error("[jobs] enqueue failed:", name, err);
    return false;
  }
}

/**
 * Dispatch a WhatsApp text message: queue it via Inngest when available, else
 * send it inline. Either path records a WhatsAppMessage row.
 */
export async function dispatchWhatsAppText(opts: {
  organizationId: string;
  to: string;
  body: string;
  memberId?: string | null;
  messageType?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  broadcastId?: string | null;
}): Promise<void> {
  const queued = await enqueue("whatsapp/message.send", opts);
  if (queued) return;
  await sendWhatsAppText({ ...opts, messageType: opts.messageType as any });
}

/** Dispatch a WhatsApp template message (queue or inline). */
export async function dispatchWhatsAppTemplate(opts: {
  organizationId: string;
  to: string;
  templateName: string;
  renderedBody: string;
  language?: string;
  params?: string[];
  memberId?: string | null;
  messageType?: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  broadcastId?: string | null;
}): Promise<void> {
  const queued = await enqueue("whatsapp/message.send", opts);
  if (queued) return;
  await sendWhatsAppTemplate({ ...opts, messageType: opts.messageType as any });
}
