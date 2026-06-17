-- ───────────────────────────────────────────────────────────────────────────
-- Defense-in-depth: enable Row Level Security on every table in `public`.
--
-- WHY (and why NOT force):
--   The app's entire data path is Prisma, connecting as the table-owner role,
--   which is NOT subject to RLS unless FORCE is used. So `ENABLE` (without
--   `FORCE`) leaves the application completely unaffected — no perf cost, no
--   query rewrites, no pgBouncer interactive-transaction requirement.
--
--   What it DOES close: the Supabase Data API (PostgREST), reachable with the
--   PUBLIC anon key. With RLS disabled, those roles can read/write tables
--   directly, bypassing the app. With RLS enabled and NO policy granting them
--   access, every anon/authenticated Data-API request is denied by default.
--
--   App-layer tenant scoping (organizationId on every Prisma query) remains the
--   in-application guard; this is the database-level safety net under it.
--
-- SAFETY: idempotent. ENABLE ROW LEVEL SECURITY is a no-op if already enabled.
--   We deliberately do NOT add `FORCE` (would lock out the owner/Prisma) and do
--   NOT create permissive policies (no role should reach data via PostgREST).
-- ───────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;
