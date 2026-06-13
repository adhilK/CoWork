import { getApiAuth, type ApiAuth } from "@/lib/auth";
import { can, isAdminRole } from "@/lib/permissions";

/**
 * PRO Services access. Anyone with the proServices capability may use the module
 * (OWNER/ADMIN/MANAGER/PRO_AGENT).
 */
export async function requireProServices(): Promise<(ApiAuth & { isAdmin: boolean }) | null> {
  const auth = await getApiAuth();
  if (!auth || !can(auth.role, "proServices")) return null;
  return { ...auth, isAdmin: isAdminRole(auth.role) };
}
