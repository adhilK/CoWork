/**
 * Visitor log cleanup — PDPL data retention enforcement.
 *
 * UAE/GCC best practice: visitor logs contain biometric-adjacent PII
 * (nationality, ID scan paths, vehicle plates). Retaining them beyond 90 days
 * without a specific legal basis violates data-minimisation principles.
 *
 * Strategy: soft-delete (set deletedAt) — records are invisible to all API
 * queries but can be recovered if a legal hold is later required. Hard deletion
 * requires a separate deliberate step by the OWNER (not automated).
 *
 * Window: configurable via VISITOR_CLEANUP_DAYS (default 90).
 */

import { prisma } from "@/lib/prisma";

const DEFAULT_CLEANUP_DAYS = 90;

export async function runVisitorCleanup(): Promise<{
  cutoff: string;
  softDeleted: number;
  alreadyDeleted: number;
}> {
  const days = parseInt(process.env.VISITOR_CLEANUP_DAYS ?? `${DEFAULT_CLEANUP_DAYS}`, 10);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Count already-soft-deleted records for the audit log (informational)
  const alreadyDeleted = await prisma.visitor.count({
    where: { deletedAt: { not: null } },
  });

  // Soft-delete visitors older than the retention window that are not yet deleted
  const { count: softDeleted } = await prisma.visitor.updateMany({
    where: {
      createdAt: { lt: cutoff },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  console.log(
    JSON.stringify({
      level: "info",
      job: "visitor-cleanup",
      cutoffDays: days,
      cutoff: cutoff.toISOString(),
      softDeleted,
      msg: `Soft-deleted ${softDeleted} expired visitor log entries`,
      ts: new Date().toISOString(),
    })
  );

  return {
    cutoff: cutoff.toISOString(),
    softDeleted,
    alreadyDeleted,
  };
}
