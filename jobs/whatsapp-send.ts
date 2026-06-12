import { inngest } from "@/lib/inngest";
import { sendWhatsAppText, sendWhatsAppTemplate } from "@/lib/whatsapp";

/**
 * WhatsApp send queue. Decouples message delivery from the request that
 * triggered it, with automatic retries on transient Meta/API failures.
 * Honours the convention: WhatsApp is never sent synchronously in a route when
 * the queue is available.
 */
export const whatsappSend = inngest.createFunction(
  {
    id: "whatsapp-send",
    name: "WhatsApp send",
    retries: 3,
    concurrency: { limit: 10 },
    triggers: [{ event: "whatsapp/message.send" }],
  },
  async ({ event, step }) => {
    const d = event.data as any;
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
        // Throw to trigger an Inngest retry on failure.
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
