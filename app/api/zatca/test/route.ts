/**
 * POST /api/zatca/test
 * Submit a minimal test invoice to Wafeq in simulation mode to verify the
 * connected account and device are working correctly. Safe to call repeatedly —
 * no real invoice is created.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { isWafeqConfigured, submitSimplifiedInvoice } from "@/lib/zatca/wafeq";

export async function POST(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  if (!isWafeqConfigured()) {
    return apiError("WAFEQ_API_KEY is not configured", 503);
  }

  const org = await prisma.organization.findUnique({
    where: { id: auth.organizationId },
    select: {
      name: true,
      taxRegistrationNumber: true,
      zatcaVatNumber: true,
      zatcaCrNumber: true,
      zatcaAddress: true,
      wafeqAccountId: true,
      zatcaDeviceId: true,
    },
  });
  if (!org) return apiError("Organization not found", 404);
  if (!org.wafeqAccountId) return apiError("Connect to Wafeq first (Step 2)", 422);
  if (!org.zatcaDeviceId) return apiError("Register a ZATCA device first (Step 3)", 422);

  const addr = (org.zatcaAddress ?? {}) as Record<string, string>;
  const vatNumber = org.zatcaVatNumber ?? org.taxRegistrationNumber ?? "";
  const issueDate = new Date().toISOString().split("T")[0];

  const testPayload = {
    document: {
      invoice_reference_number: `TEST-${Date.now()}`,
      issue_date: issueDate,
      supply_date: issueDate,
      currency: "SAR",
      supplier: {
        name: org.name,
        tax_registration_number: vatNumber,
        ...(org.zatcaCrNumber
          ? { identification: { value: org.zatcaCrNumber, scheme: "CRN" } }
          : {}),
        address: {
          street: addr.street ?? "N/A",
          city: addr.city ?? "Riyadh",
          country_code: "SA",
        },
      },
      customer: {
        name: "Test Customer",
        address: { country_code: "SA" },
      },
      line_items: [
        {
          name: "Test Service",
          quantity: 1,
          unit_price: 100,
          tax_percentage: 15,
          discount: 0,
        },
      ],
    },
    language: "ar" as const,
  };

  try {
    const result = await submitSimplifiedInvoice(org.wafeqAccountId, testPayload);
    return apiSuccess({
      success: true,
      wafeqInvoiceId: result.id,
      uuid: result.uuid,
      status: result.status,
      hasQrCode: !!result.qr_code,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Test submission failed";
    return apiError(msg, 502);
  }
}
