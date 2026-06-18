/**
 * AES-256-CBC encryption for sensitive PII stored in the database.
 * Used for: passport numbers, Emirates IDs, Iqama numbers, API keys.
 *
 * Requires: ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * In dev without ENCRYPTION_KEY, encrypt/decrypt are no-ops — app still runs.
 * Set the key before storing real data in production.
 *
 * ── Key versioning ───────────────────────────────────────────────────────────
 * New ciphertext format:  v{N}:ivHex:ciphertextHex
 * Legacy format (v0):     ivHex:ciphertextHex   (no version prefix)
 *
 * ENCRYPTION_KEY_VERSION controls the version label embedded in new ciphertext.
 * The decrypt function handles both formats — full backward compatibility.
 *
 * ── Key rotation ─────────────────────────────────────────────────────────────
 * During rotation, set ENCRYPTION_KEY_PREVIOUS to the old key. The
 * decryptWithFallback() export will try the current key first, then fall back
 * to the previous key. Run scripts/rotate-encryption-key.ts to re-encrypt all
 * records, then remove ENCRYPTION_KEY_PREVIOUS.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-cbc";

function getKey(envVar = "ENCRYPTION_KEY"): Buffer | null {
  const k = process.env[envVar];
  if (!k) return null;
  const buf = Buffer.from(k, "hex");
  // AES-256 requires exactly 32 bytes (64 hex chars)
  return buf.length === 32 ? buf : null;
}

const KEY_VERSION = process.env.ENCRYPTION_KEY_VERSION ?? "1";

/** Encrypt a string. Returns versioned ciphertext: `v{N}:ivHex:ciphertextHex`. */
export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text; // dev fallback — no key set
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `v${KEY_VERSION}:${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a ciphertext produced by encrypt(). Handles both:
 * - Versioned format:  v1:ivHex:ciphertextHex
 * - Legacy format:     ivHex:ciphertextHex   (no version prefix)
 */
export function decrypt(data: string): string {
  const key = getKey();
  if (!key) return data; // dev fallback
  return decryptWithKey(data, key);
}

function decryptWithKey(data: string, key: Buffer): string {
  // Strip optional version prefix (v1:, v2:, etc.)
  let payload = data;
  if (/^v\d+:/.test(data)) {
    const firstColon = data.indexOf(":");
    payload = data.slice(firstColon + 1);
  }

  if (!payload.includes(":")) return data; // not encrypted (plaintext or dev mode)

  const colonIdx = payload.indexOf(":");
  const ivHex = payload.slice(0, colonIdx);
  const encHex = payload.slice(colonIdx + 1);
  try {
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encHex, "hex");
    const decipher = createDecipheriv(ALGO, key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return data; // decryption failed — return raw (caller must handle)
  }
}

/**
 * Decrypt with automatic fallback to the previous key during a rotation window.
 * Use this in the rotation script and anywhere records from multiple key versions
 * may exist simultaneously.
 */
export function decryptWithFallback(data: string): string {
  const key = getKey();
  if (!key) return data;
  try {
    return decryptWithKey(data, key);
  } catch {
    const prevKey = getKey("ENCRYPTION_KEY_PREVIOUS");
    if (!prevKey) return data;
    try {
      return decryptWithKey(data, prevKey);
    } catch {
      return data; // both keys failed — data corrupted or in plaintext
    }
  }
}

/** Encrypt a nullable string — returns null if value is empty. */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  return encrypt(value);
}

/** Decrypt a nullable string — returns null if value is empty. */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return null;
  return decrypt(value);
}
