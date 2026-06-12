import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";

/**
 * ZATCA e-invoicing submission queue (KSA) — Phase 2 STUB.
 *
 * Mandatory ZATCA reporting/clearance will be implemented via certified
 * middleware (e.g. Wafeq) in Phase 3. This function establishes the durable,
 * retried queue now so invoice creation can fire-and-forget a submission event;
 * today it just records intent. Do NOT build the cryptographic stamping here —
 * route it through the certified provider when wired up.
 */
export const zatcaSubmit = inngest.createFunction(
  {
    id: "zatca-submit",
    name: "ZATCA submit (stub)",
    retries: 3,
    triggers: [{ event: "zatca/invoice.submit" }],
  },
  async ({ event, step }) => {
    const { organizationId, invoiceId } = event.data as any;

    return step.run("record-intent", async () => {
      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId, deletedAt: null },
        select: { id: true, invoiceNumber: true },
      });
      if (!invoice) return { skipped: true, reason: "invoice not found" };

      // Placeholder: real implementation submits to ZATCA via middleware and
      // stores the cleared XML/QR + UUID on the invoice.
      console.log(`[zatca] would submit invoice ${invoice.invoiceNumber ?? invoice.id} for org ${organizationId}`);
      return { submitted: false, stub: true, invoiceId: invoice.id };
    });
  }
);
