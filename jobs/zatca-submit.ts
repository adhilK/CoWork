import { inngest } from "@/lib/inngest";
import { submitInvoiceToZatca } from "@/lib/zatca";
import { captureServerError } from "@/lib/observability";
import { prisma } from "@/lib/prisma";
import type { CoworkEvents } from "@/lib/inngest";

type ZatcaPayload = CoworkEvents["zatca/invoice.submit"]["data"];

/**
 * ZATCA e-invoicing submission queue (KSA).
 *
 * Phase 1 (QR generation) happens synchronously at invoice creation.
 * This queue handles Phase-2 reporting/clearance. Today `submitInvoiceToZatca`
 * is a stub that transitions the invoice PENDING → REPORTED; in Phase 3 its
 * body submits the signed UBL XML via certified middleware (e.g. Wafeq). The
 * durable, retried queue is in place now so call sites don't change when the
 * real submission lands.
 *
 * Retries: 3 — ZATCA's API can be slow or temporarily unavailable; three
 * attempts with exponential backoff covers transient outages without losing
 * the submission.
 *
 * Dead-letter: marks the invoice ZATCA status as REJECTED (the closest
 * available state for "failed to submit") and captures to Sentry. The operator
 * can re-queue from the invoice detail page once the issue is resolved.
 */
export const zatcaSubmit = inngest.createFunction(
  {
    id: "zatca-submit",
    name: "ZATCA submit",
    retries: 3,
    triggers: [{ event: "zatca/invoice.submit" }],
    onFailure: async ({ error, event }) => {
      const err = error instanceof Error ? error : new Error(String(error));
      const d = (event.data as unknown as { event: { data: ZatcaPayload } }).event.data;

      captureServerError(err, {
        job: "zatca-submit",
        phase: "dead-letter",
        organizationId: d.organizationId,
        invoiceId: d.invoiceId,
        action: "Invoice ZATCA status set to REJECTED — manual resubmission required",
      });

      // Mark the invoice as REJECTED so it surfaces in the dashboard and the
      // operator knows it needs attention. REJECTED is the closest ZatcaStatus
      // to "submission failed"; re-queuing will transition it back to PENDING.
      try {
        await prisma.invoice.updateMany({
          where: {
            id: d.invoiceId,
            organizationId: d.organizationId,
            zatcaStatus: "PENDING",
          },
          data: { zatcaStatus: "REJECTED" },
        });
      } catch {
        // DB update failure in the dead-letter handler must never throw.
      }
    },
  },
  async ({ event, step }) => {
    const { invoiceId } = event.data as ZatcaPayload;

    return step.run("submit", async () => {
      const result = await submitInvoiceToZatca(invoiceId);
      // submitInvoiceToZatca returns null when the invoice is not KSA or ZATCA
      // is not enabled — treat as a clean skip.
      return result ?? { skipped: true };
    });
  }
);
