/**
 * Encryption key rotation script.
 *
 * OVERVIEW
 * ────────
 * This script re-encrypts all PII fields in the database from the OLD key
 * (ENCRYPTION_KEY_PREVIOUS) to the NEW key (ENCRYPTION_KEY). Run this during
 * a maintenance window after rotating the key in your secrets manager.
 *
 * HOW IT WORKS
 * ────────────
 * 1. Set ENCRYPTION_KEY to the NEW key (64 hex chars = 32 bytes).
 * 2. Set ENCRYPTION_KEY_PREVIOUS to the OLD key.
 * 3. Increment ENCRYPTION_KEY_VERSION (e.g. "1" → "2") so new ciphertext is
 *    tagged with the new version.
 * 4. Run this script. It decrypts each field with decryptWithFallback() (tries
 *    new key first, then old key), re-encrypts with the new key, and writes
 *    back to the DB.
 * 5. Once the script completes without errors, remove ENCRYPTION_KEY_PREVIOUS
 *    from your env/secrets.
 *
 * FIELDS ROTATED
 * ──────────────
 *   Member:  passportNumber, emiratesId, iqamaNumber
 *   (API keys stored in Organization or integrations tables — add below if needed)
 *
 * SAFETY NOTES
 * ────────────
 * - Run in a maintenance window or during low-traffic hours.
 * - The script uses updateMany in batches of 100 to avoid OOM on large tables.
 * - Idempotent: fields already encrypted with the new key will be silently
 *   skipped (decryptWithFallback will succeed on the new key; re-encrypt
 *   produces identical ciphertext structure with a fresh IV — no data loss).
 * - DRY RUN mode (--dry-run flag): prints counts without writing to the DB.
 * - Run from the project root: npx ts-node -r tsconfig-paths/register scripts/rotate-encryption-key.ts
 *
 * CAUTION: DO NOT RUN IN PRODUCTION WITHOUT REVIEWING THIS SCRIPT AND TAKING A DB BACKUP.
 */

import { PrismaClient } from "@prisma/client";
import { decryptWithFallback, encrypt } from "../lib/encryption";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 100;

async function rotateMemberFields() {
  let rotated = 0;
  let skipped = 0;
  let offset = 0;

  console.log("[rotate] Starting Member PII rotation…");

  while (true) {
    const members = await prisma.member.findMany({
      where: {
        deletedAt: null,
        OR: [
          { passportNumber: { not: null } },
          { emiratesId: { not: null } },
          { iqamaNumber: { not: null } },
        ],
      },
      select: { id: true, passportNumber: true, emiratesId: true, iqamaNumber: true },
      skip: offset,
      take: BATCH,
    });

    if (members.length === 0) break;
    offset += members.length;

    for (const member of members) {
      const updated: Partial<typeof member> = {};

      if (member.passportNumber) {
        const plain = decryptWithFallback(member.passportNumber);
        updated.passportNumber = encrypt(plain);
      }
      if (member.emiratesId) {
        const plain = decryptWithFallback(member.emiratesId);
        updated.emiratesId = encrypt(plain);
      }
      if (member.iqamaNumber) {
        const plain = decryptWithFallback(member.iqamaNumber);
        updated.iqamaNumber = encrypt(plain);
      }

      if (Object.keys(updated).length === 0) {
        skipped++;
        continue;
      }

      if (!DRY_RUN) {
        await prisma.member.update({
          where: { id: member.id },
          data: updated,
        });
      }
      rotated++;
    }

    console.log(`[rotate] Processed batch — offset ${offset}, rotated so far: ${rotated}`);
  }

  return { rotated, skipped };
}

async function main() {
  console.log(
    DRY_RUN
      ? "[rotate] DRY RUN — no DB writes will occur"
      : "[rotate] LIVE RUN — DB writes enabled"
  );
  console.log(`[rotate] ENCRYPTION_KEY_VERSION = ${process.env.ENCRYPTION_KEY_VERSION ?? "(unset, defaults to 1)"}`);

  if (!process.env.ENCRYPTION_KEY) {
    console.error("[rotate] ERROR: ENCRYPTION_KEY is not set. Aborting.");
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY_PREVIOUS) {
    console.warn("[rotate] WARNING: ENCRYPTION_KEY_PREVIOUS is not set. Only fields already encrypted with the current key will be processable.");
  }

  const memberResult = await rotateMemberFields();

  console.log("\n[rotate] ── Summary ──────────────────────────────────────────");
  console.log(`  Member records rotated : ${memberResult.rotated}`);
  console.log(`  Member records skipped : ${memberResult.skipped}`);
  if (DRY_RUN) {
    console.log("\n  DRY RUN complete. No changes were made.");
    console.log("  Re-run without --dry-run to apply.");
  } else {
    console.log("\n  Rotation complete.");
    console.log("  Once verified, remove ENCRYPTION_KEY_PREVIOUS from your environment.");
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[rotate] Fatal error:", err);
  prisma.$disconnect().finally(() => process.exit(1));
});
