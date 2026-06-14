import { getApiAuth, type ApiAuth } from "@/lib/auth";
import { can } from "@/lib/permissions";

/** Partner-network access (OWNER/ADMIN/MANAGER via the "partners" capability). */
export async function requirePartners(): Promise<ApiAuth | null> {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "partners")) return null;
  return auth;
}

/** Compute a referral commission from the partner's terms. */
export function computeCommission(
  commissionType: "PERCENTAGE" | "FIXED",
  commissionRate: number,
  dealValue: number | null
): number {
  if (commissionType === "FIXED") return commissionRate;
  if (dealValue == null) return 0;
  return Math.round(((dealValue * commissionRate) / 100 + Number.EPSILON) * 100) / 100;
}

export const PARTNER_TYPES = ["INDIVIDUAL", "COMPANY", "AGENCY", "FREELANCER", "OTHER"] as const;
export const PARTNER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Individual", COMPANY: "Company", AGENCY: "Agency", FREELANCER: "Freelancer", OTHER: "Other",
};
export const REFERRAL_STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  PENDING: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700" },
  CONVERTED: { label: "Converted", bg: "bg-blue-50", text: "text-blue-700" },
  PAID: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  CANCELLED: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-400" },
};
