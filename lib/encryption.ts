/**
 * AES-256-CBC encryption for sensitive PII stored in the database.
 * Used for: passport numbers, Emirates IDs, Iqama numbers, API keys.
 *
 * Requires: ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * A random 16-byte IV is generated per value and prepended to the ciphertext,
 * stored as "ivHex:ciphertextHex".
 *
 * In dev without ENCRYPTION_KEY set, encrypt/decrypt are no-ops so the app
 * still runs. Set the key before storing real data.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-cbc";

function getKey(): Buffer | null {
  const k = process.env.ENCRYPTION_KEY;
  if (!k) return null;
  return Buffer.from(k, "hex");
}

export function encrypt(text: string): string {
  const key = getKey();
  if (!key) return text; // dev fallback — no key set
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(data: string): string {
  const key = getKey();
  if (!key) return data; // dev fallback
  if (!data.includes(":")) return data; // not encrypted (plaintext from before key was set)
  const colonIdx = data.indexOf(":");
  const ivHex = data.slice(0, colonIdx);
  const encHex = data.slice(colonIdx + 1);
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv(ALGO, key, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
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
