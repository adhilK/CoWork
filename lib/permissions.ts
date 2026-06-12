/**
 * Role-based access control — single source of truth for what each role can do.
 *
 * The app has six roles (UserRole). Access is expressed as capabilities (areas
 * of the product). Use `can(role, capability)` everywhere instead of comparing
 * role strings inline, so Phase-3 modules and the nav stay consistent.
 *
 *   OWNER        full access incl. billing & settings
 *   ADMIN        full operational access, no billing
 *   MANAGER      operational access (location-scoped), no billing/settings
 *   RECEPTIONIST visitors + bookings view only
 *   PRO_AGENT    PRO services + business setup + related documents only
 *   MEMBER       portal only (never reaches the admin dashboard)
 */

export type AppRole = "OWNER" | "ADMIN" | "MANAGER" | "RECEPTIONIST" | "PRO_AGENT" | "MEMBER";

export type Capability =
  | "dashboard"
  | "bookings"
  | "resources"
  | "locations"
  | "members"
  | "plans"
  | "visitors"
  | "invoices"
  | "documents"
  | "virtualOffice"
  | "whatsapp"
  | "analytics"
  | "automations"
  | "community"
  | "businessSetup" // Phase 3
  | "proServices"   // Phase 3
  | "billing"       // platform subscription / billing
  | "settings";     // org settings + integrations

const ALL: Capability[] = [
  "dashboard", "bookings", "resources", "locations", "members", "plans",
  "visitors", "invoices", "documents", "virtualOffice", "whatsapp", "analytics",
  "automations", "community", "businessSetup", "proServices", "billing", "settings",
];

// Everything an ADMIN can do = everything except platform billing.
const ADMIN_CAPS: Capability[] = ALL.filter((c) => c !== "billing");

// Operational manager: no billing, no org settings/integrations.
const MANAGER_CAPS: Capability[] = ADMIN_CAPS.filter(
  (c) => !["settings", "whatsapp", "automations"].includes(c)
);

const ROLE_CAPS: Record<AppRole, Capability[]> = {
  OWNER: ALL,
  ADMIN: ADMIN_CAPS,
  MANAGER: MANAGER_CAPS,
  RECEPTIONIST: ["dashboard", "visitors", "bookings"],
  PRO_AGENT: ["dashboard", "proServices", "businessSetup", "documents"],
  MEMBER: [],
};

function asRole(role: string): AppRole {
  return (["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST", "PRO_AGENT", "MEMBER"] as const).includes(role as AppRole)
    ? (role as AppRole)
    : "MEMBER";
}

/** Does this role have the given capability? */
export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPS[asRole(role)].includes(capability);
}

/** All capabilities for a role (e.g. to filter nav). */
export function capabilitiesFor(role: string | null | undefined): Capability[] {
  if (!role) return [];
  return ROLE_CAPS[asRole(role)];
}

/** Roles allowed on the general admin API (operational admins). */
export const ADMIN_API_ROLES: AppRole[] = ["OWNER", "ADMIN", "MANAGER"];

/** Is this an operational-admin role (gates the shared admin API)? */
export function isAdminRole(role: string | null | undefined): boolean {
  return !!role && (ADMIN_API_ROLES as string[]).includes(role);
}

/** Can this role manage platform billing? (OWNER only.) */
export function canBilling(role: string | null | undefined): boolean {
  return role === "OWNER";
}

/**
 * Where a role should land after login. Restricted roles go straight to the
 * section they work in instead of a dashboard full of things they can't use.
 */
export function homePathForRole(role: string | null | undefined): string {
  switch (asRole(role ?? "MEMBER")) {
    case "RECEPTIONIST": return "/dashboard/visitors";
    case "PRO_AGENT": return "/dashboard/pro-services";
    case "MEMBER": return "/portal";
    default: return "/dashboard";
  }
}
