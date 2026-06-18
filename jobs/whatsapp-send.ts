import { inngest } from "@/lib/inngest";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { captureServerError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import type { CoworkEvents } from "@/lib/inngest";

type SendPayload = CoworkEvents["whatsapp/message.send"]["data"];

/**
 * WhatsApp send queue — decouples message delivery from the request that
 * triggered it (booking confirmation, invoice notification, reminder, etc.).
 *
 * Retries: 3 attempts with exponential backoff. Meta's Graph API is
 * occasionally flaky; transient 5xx/503s will resolve on retry.
 * Concurrency: capped at 5 to stay within the Inngest free-plan limit and
 * avoid hammering the per-number WhatsApp rate limit.
 *
 * Dead-letter: on final failure after all retries, captures to Sentry and
 * marks any existing WhatsAppMessage record as FAILED so it surfaces in the
 * inbox with a visible error state rather than disappearing silently.
 */
export const whatsappSend = inngest.createFunction(
  {
    id: "whatsapp-send",
    name: "WhatsApp send",
    retries: 3,
    concurrency: { limit: 5 },
    triggers: [{ event: "whatsapp/message.send" }],
    onFailure: async ({ error, event }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      // In onFailure, event.data is the failure envelope: { error, event, function_id, run_id }.
      // The original triggering event is nested at event.data.event.data.
      const d = (event.data as unknown as { event: { data: SendPayload } }).event.data;

      captureServerError(err, {
        job: "whatsapp-send",
        phase: "dead-letter",
        organizationId: d.organizationId,
        to: d.to,
        memberId: d.memberId ?? undefined,
        messageType: d.messageType ?? "CUSTOM",
      });

      // Mark any WhatsApp message record for this send as FAILED so the
      // operator can see it in the inbox rather than having it disappear.
      // We match on organizationId + to + recent time window since we don't
      // have the message ID at the event level.
      try {
        const since = new Date(Date.now() - 10 * 60 * 1000); // 10-min window
        await prisma.whatsAppMessage.updateMany({
          where: {
            organizationId: d.organizationId,
            phone: d.to,
            direction: "OUTBOUND",
            status: { in: ["QUEUED", "SENT"] },
            sentAt: { gte: since },
          },
          data: { status: "FAILED" },
        });
      } catch {
        // DB update failure in the dead-letter handler must never throw —
        // Sentry already has the event above.
      }
    },
  },
  async ({ event, step }) => {
    const d = event.data as SendPayload;

    return step.run("send", async () => {
      if (d.templateName) {
        const res = await sendWhatsAppTemplate({
          organizationId: d.organizationId,
          to: d.to,
          memberId: d.memberId ?? null,
          templateName: d.templateName,
          language: d.language,
          params: d.params ?? [],
          renderedBody: d.renderedBody ?? d.body ?? d.templateName,
          messageType: (d.messageType as any) ?? "CUSTOM",
          relatedEntityType: d.relatedEntityType ?? null,
          relatedEntityId: d.relatedEntityId ?? null,
          broadcastId: d.broadcastId ?? null,
        });
        // Throwing here triggers an Inngest retry with backoff.
        if (!res.ok) throw new Error(res.error ?? "WhatsApp template send failed");
        return res;
      }

      const res = await sendWhatsAppText({
        organizationId: d.organizationId,
        to: d.to,
        memberId: d.memberId ?? null,
        body: d.body ?? "",
        messageType: (d.messageType as any) ?? "CUSTOM",
        relatedEntityType: d.relatedEntityType ?? null,
        relatedEntityId: d.relatedEntityId ?? null,
        broadcastId: d.broadcastId ?? null,
      });
      if (!res.ok) throw new Error(res.error ?? "WhatsApp send failed");
      return res;
    });
  }
);
