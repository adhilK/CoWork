/**
 * Supabase Storage helpers for the Document Vault.
 *
 * Documents live in a PRIVATE bucket. We never expose the storage object path to
 * the client — downloads are served via short-lived (15-minute) signed URLs
 * generated on demand by the API. All operations use the service-role admin
 * client so they bypass RLS (access control is enforced in the API layer by
 * scoping every query to the caller's organizationId / memberId).
 */

import { createClient } from "@supabase/supabase-js";

export const DOCUMENTS_BUCKET = "documents";
export const SIGNED_URL_TTL = 15 * 60; // 15 minutes, in seconds
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/**
 * Service-role storage client. Separate from the SSR cookie client because
 * storage operations are pure server-to-server and must not depend on the
 * request's auth cookie.
 */
function storageClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

let bucketEnsured = false;

/** Lazily ensure the private documents bucket exists. Safe to call repeatedly. */
export async function ensureDocumentsBucket(): Promise<void> {
  if (bucketEnsured) return;
  const supabase = storageClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === DOCUMENTS_BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(DOCUMENTS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_BYTES,
    });
  }
  bucketEnsured = true;
}

/** Build the org-scoped object path for a document file. */
export function buildDocumentPath(
  organizationId: string,
  memberId: string,
  documentId: string,
  fileName: string
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${organizationId}/${memberId}/${documentId}/${safeName}`;
}

export type UploadResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/** Upload a file buffer to the private documents bucket. */
export async function uploadDocument(
  path: string,
  body: ArrayBuffer | Buffer | Uint8Array,
  contentType: string
): Promise<UploadResult> {
  try {
    await ensureDocumentsBucket();
    const supabase = storageClient();
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, body as any, { contentType, upsert: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed" };
  }
}

/**
 * Generate a 15-minute signed URL for a stored object. Optionally forces a
 * download with a friendly filename.
 */
export async function getSignedUrl(
  path: string,
  downloadFileName?: string
): Promise<string | null> {
  try {
    const supabase = storageClient();
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL, downloadFileName ? { download: downloadFileName } : undefined);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Remove an object from the bucket (best-effort). */
export async function deleteDocumentObject(path: string): Promise<void> {
  try {
    const supabase = storageClient();
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([path]);
  } catch {
    // best-effort — DB soft-delete is the source of truth
  }
}
