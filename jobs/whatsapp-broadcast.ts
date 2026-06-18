import { inngest } from "@/lib/inngest";
import { runBroadcast } from "@/lib/jobs/broadcast";
import { captureServerError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import type { CoworkEvents } from "@/lib/inngest";

type BroadcastPayload = CoworkEvents["whatsapp/broadcast.send"]["data"];

/**
 * WhatsApp broadcast fan-out — triggered by `whatsapp/broadcast.send` after the
 * API route creates the broadcast row. Decouples the large send from the request.
 *
 * Retries: 2 attempts. Broadcasts are stateful (the row tracks sent/failed
 * counts), so a full retry would re-send to the entire audience. The current
 * `runBroadcast` does not track per-recipient progress, so retries on partial
 * failure will cause duplicate sends to already-delivered recipients. 2 retries
 * is a pragmatic cap until per-recipient checkpointing is added.
 *
 * Dead-letter: marks the broadcast row FAILED so it surfaces in the dashboard
 * with a visible error state, and captures to Sentry.
 */
export const whatsappBroadcast = inngest.createFunction(
  {
    id: "whatsapp-broadcast",
    name: "WhatsApp broadcast",
    retries: 2,
    concurrency: { limit: 2 },
    triggers: [{ event: "whatsapp/broadcast.send" }],
    onFailure: async ({ error, event }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      const d = (event.data as unknown as { event: { data: BroadcastPayload } }).event.data;

      captureServerError(err, {
        job: "whatsapp-broadcast",
        phase: "dead-letter",
        organizationId: d.organizationId,
        broadcastId: d.broadcastId,
      });

      // Mark the broadcast as FAILED so it doesn't sit as SENDING indefinitely.
      try {
        await prisma.whatsAppBroadcast.updateMany({
          where: {
            id: d.broadcastId,
            organizationId: d.organizationId,
            status: "SENDING",
          },
          data: { status: "FAILED", completedAt: new Date() },
        });
      } catch {
        // DB update failure in the dead-letter handler must never throw.
      }
    },
  },
  async ({ event, step }) => {
    const { organizationId, broadcastId } = event.data as BroadcastPayload;
    return step.run("fan-out", () => runBroadcast(organizationId, broadcastId));
  }
);
