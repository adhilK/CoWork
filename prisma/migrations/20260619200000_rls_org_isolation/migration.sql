-- ─────────────────────────────────────────────────────────────────────────────
-- RLS: Row-Level Security — org isolation safety net
--
-- Prisma uses the Supabase service_role (BYPASSRLS) so these policies do NOT
-- affect Prisma queries. What they DO protect:
--   • Direct DB access via Supabase dashboard SQL editor
--   • Supabase REST API calls using the anon / authenticated key
--   • Any future Supabase JS client calls added alongside Prisma
--
-- Policy pattern: a user may only read/write rows belonging to an organization
-- they are a member of (checked via UserOrganization join).
-- auth.uid() is set by Supabase GoTrue JWT — null for service_role (bypasses).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Helper: org membership check ─────────────────────────────────────────────
-- Reused across all org-scoped policies. Returns true if the current Supabase
-- auth user belongs to the given organizationId.
CREATE OR REPLACE FUNCTION auth_user_in_org(org_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "UserOrganization"
    WHERE "organizationId" = org_id
      AND "userId" = (auth.uid())::text
  )
$$;

-- ── Enable RLS ────────────────────────────────────────────────────────────────

-- Root org table — user must be a member of this org
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
-- Join table — user sees their own memberships
ALTER TABLE "UserOrganization" ENABLE ROW LEVEL SECURITY;
-- User record — users see only their own row
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Org-scoped operational tables
ALTER TABLE "Location"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Member"                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipPlan"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visitor"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Delivery"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event"                     ENABLE ROW LEVEL SECURITY;

-- Config tables (1:1 with org)
ALTER TABLE "JurisdictionConfig"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PlatformSubscription"      ENABLE ROW LEVEL SECURITY;

-- Virtual office module
ALTER TABLE "VirtualOfficeAddress"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VirtualOfficeSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailItem"                  ENABLE ROW LEVEL SECURITY;

-- WhatsApp module
ALTER TABLE "WhatsAppConfig"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppMessage"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppTemplate"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppBroadcast"         ENABLE ROW LEVEL SECURITY;

-- Document vault
ALTER TABLE "Document"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DocumentRequest"           ENABLE ROW LEVEL SECURITY;

-- Business setup CRM
ALTER TABLE "LicenseCatalog"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessSetupLead"         ENABLE ROW LEVEL SECURITY;

-- PRO services
ALTER TABLE "ProServiceRequest"         ENABLE ROW LEVEL SECURITY;

-- Partners & referrals
ALTER TABLE "Partner"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral"                  ENABLE ROW LEVEL SECURITY;

-- Compliance (user-scoped, not org-scoped)
ALTER TABLE "ConsentLog"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DataErasureLog"            ENABLE ROW LEVEL SECURITY;

-- ── Policies: User & UserOrganization ────────────────────────────────────────

-- Users see only their own record
CREATE POLICY "users_own_row" ON "User"
  FOR ALL
  USING ((auth.uid())::text = id)
  WITH CHECK ((auth.uid())::text = id);

-- Users see their own org memberships
CREATE POLICY "userorgs_own_rows" ON "UserOrganization"
  FOR ALL
  USING ((auth.uid())::text = "userId")
  WITH CHECK ((auth.uid())::text = "userId");

-- ── Policies: Organization ────────────────────────────────────────────────────

CREATE POLICY "org_member_access" ON "Organization"
  FOR ALL
  USING (auth_user_in_org(id))
  WITH CHECK (auth_user_in_org(id));

-- ── Macro: org-scoped tables with direct organizationId column ────────────────
-- Each table gets a single policy scoped by org membership.

CREATE POLICY "org_isolation" ON "Location"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Resource"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Member"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "MembershipPlan"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Booking"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Invoice"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Visitor"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Delivery"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Announcement"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Event"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "JurisdictionConfig"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "PlatformSubscription"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "VirtualOfficeAddress"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "VirtualOfficeSubscription"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "MailItem"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "WhatsAppConfig"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "WhatsAppMessage"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "WhatsAppTemplate"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "WhatsAppBroadcast"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Document"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "DocumentRequest"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "LicenseCatalog"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "BusinessSetupLead"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "ProServiceRequest"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Partner"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

CREATE POLICY "org_isolation" ON "Referral"
  FOR ALL USING (auth_user_in_org("organizationId"))
  WITH CHECK (auth_user_in_org("organizationId"));

-- ── Compliance tables (user-scoped) ──────────────────────────────────────────

-- ConsentLog: users see only their own consent records
CREATE POLICY "own_consent" ON "ConsentLog"
  FOR ALL
  USING ((auth.uid())::text = "userId")
  WITH CHECK ((auth.uid())::text = "userId");

-- DataErasureLog: no direct access (admin-only via service_role / Prisma)
CREATE POLICY "no_direct_access" ON "DataErasureLog"
  FOR ALL
  USING (false)
  WITH CHECK (false);
