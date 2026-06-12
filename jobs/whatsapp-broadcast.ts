import { inngest } from "@/lib/inngest";
import { runBroadcast } from "@/lib/jobs/broadcast";

/**
 * WhatsApp broadcast fan-out. Triggered by `whatsapp/broadcast.send` after the
 * API route creates the broadcast row, so a large send never blocks the request.
 */
export const whatsappBroadcast = inngest.createFunction(
  {
    id: "whatsapp-broadcast",
    name: "WhatsApp broadcast",
    retries: 1,
    concurrency: { limit: 2 },
    triggers: [{ event: "whatsapp/broadcast.send" }],
  },
  async ({ event, step }) => {
    const { organizationId, broadcastId } = event.data as any;
    return step.run("fan-out", () => runBroadcast(organizationId, broadcastId));
  }
);
