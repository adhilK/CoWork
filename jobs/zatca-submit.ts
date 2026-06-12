import { inngest } from "@/lib/inngest";
import { submitInvoiceToZatca } from "@/lib/zatca";

/**
 * ZATCA e-invoicing submission queue (KSA).
 *
 * Phase 1 (the QR) is generated synchronously at invoice creation. This queue
 * handles Phase-2 reporting/clearance. Today `submitInvoiceToZatca` is a STUB
 * that transitions the invoice PENDING → REPORTED; in Phase 3 its body submits
 * the signed UBL XML via certified middleware (e.g. Wafeq). The durable, retried
 * queue is in place now so nothing changes at the call sites when that lands.
 */
export const zatcaSubmit = inngest.createFunction(
  {
    id: "zatca-submit",
    name: "ZATCA submit",
    retries: 3,
    triggers: [{ event: "zatca/invoice.submit" }],
  },
  async ({ event, step }) => {
    const { invoiceId } = event.data as any;
    return step.run("submit", async () => {
      const result = await submitInvoiceToZatca(invoiceId);
      return result ?? { skipped: true };
    });
  }
);
