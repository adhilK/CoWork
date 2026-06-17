SELECT
  count(*) FILTER (WHERE rowsecurity) AS rls_enabled,
  count(*) FILTER (WHERE NOT rowsecurity) AS rls_disabled,
  count(*) AS total
FROM pg_tables
WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
