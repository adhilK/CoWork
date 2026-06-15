import { NextRequest } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { uploadSpaceImage, MAX_PHOTO_BYTES } from "@/lib/storage";
import { apiError, apiSuccess } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * Upload a single space/location image. Admin-only. Returns the public URL,
 * which the caller stores in the resource/location `images` array.
 * Body: multipart/form-data with `file` and optional `kind` (resource|location).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError("Expected multipart/form-data", 400);
  }

  const file = form.get("file");
  const kindRaw = String(form.get("kind") ?? "resource");
  const kind = kindRaw === "location" ? "location" : "resource";

  if (!(file instanceof File)) return apiError("No file provided", 400);
  if (file.size === 0) return apiError("File is empty", 400);
  if (file.size > MAX_PHOTO_BYTES) {
    return apiError(`Image must be under ${Math.round(MAX_PHOTO_BYTES / (1024 * 1024))} MB`, 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await uploadSpaceImage(
    auth.organizationId,
    kind,
    file.name || "image",
    bytes,
    file.type
  );
  if (!result.ok) return apiError(result.error, 400);

  return apiSuccess({ url: result.url }, 201);
}
