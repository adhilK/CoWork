/**
 * Inngest client — the background-job runner for CoWork Pro.
 *
 * Replaces the single Vercel cron with a real queue: scheduled jobs (monthly
 * billing, daily reminders) plus event-driven queues (WhatsApp sends/broadcasts,
 * ZATCA submissions) with automatic retries and step-level durability.
 *
 * Functions are served from app/api/inngest/route.ts. In production, set
 * INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY. Locally, run `npx inngest-cli dev`.
 */

import { Inngest } from "inngest";

// Event catalogue — the contract between producers (API routes, jobs) and
// consumers (the functions in /jobs). Used to type our own `enqueue` helper.
type Events = {
  "billing/monthly.run": { data: { triggeredBy?: string } };
  "reminders/daily.run": { data: { triggeredBy?: string } };
  "whatsapp/message.send": {
    data: {
      organizationId: string;
      to: string;
      memberId?: string | null;
      messageType?: string;
      // Either freeform text…
      body?: string;
      // …or a template send
      templateName?: string;
      language?: string;
      params?: string[];
      renderedBody?: string;
      relatedEntityType?: string | null;
      relatedEntityId?: string | null;
      broadcastId?: string | null;
    };
  };
  "whatsapp/broadcast.send": {
    data: { organizationId: string; broadcastId: string };
  };
  "zatca/invoice.submit": {
    data: { organizationId: string; invoiceId: string; attempt?: number };
  };
};

export const inngest = new Inngest({ id: "coworkpro" });

export type CoworkEvents = Events;
