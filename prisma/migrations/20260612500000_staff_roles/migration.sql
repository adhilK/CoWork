-- Add staff roles (Phase 3). Postgres requires ALTER TYPE ... ADD VALUE per value,
-- and these must run outside a transaction; Prisma runs each statement separately.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MANAGER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTIONIST';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PRO_AGENT';
