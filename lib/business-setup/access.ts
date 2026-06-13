import { getApiAuth, type ApiAuth } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/permissions";

/**
 * Business Setup CRM access. Anyone with the businessSetup capability may use
 * the CRM (OWNER/ADMIN/MANAGER/PRO_AGENT). Returns the auth + whether the caller
 * is an operational admin (can manage the catalog / reassign freely).
 */
export async function requireBusinessSetup(): Promise<(ApiAuth & { isAdmin: boolean }) | null> {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "businessSetup")) return null;
  return { ...auth, isAdmin: isAdminRole(auth.role) };
}
