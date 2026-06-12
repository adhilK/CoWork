import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import { functions } from "@/jobs";

// Inngest endpoint — registers all background-job functions. In production,
// set INNGEST_SIGNING_KEY (request verification) + INNGEST_EVENT_KEY (sending).
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
