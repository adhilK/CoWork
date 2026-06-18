/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the operator's organization and all associated data,
 * then removes the user from Prisma and Supabase auth.
 *
 * Auth: OWNER role only.
 *
 * Deletion order (foreign-key safe):
 *   1. Supabase Storage documents (best-effort)
 *   2. ConsentLog records for this user (not cascade-deleted by org deletion)
 *   3. Organization — cascades to all org-scoped records
 *   4. User (Prisma)
 *   5. User (Supabase auth via service role)
 */

import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: user.id },
    select: { organizationId: true, role: true },
    orderBy: { createdAt: "asc" },
  });

  if (!userOrg || userOrg.role !== "OWNER") {
    return NextResponse.json({ error: "OWNER role required" }, { status: 403 });
  }

  const { organizationId } = userOrg;

  try {
    // 1. Delete document files from Supabase Storage (best-effort).
    //    Document.fileUrl holds the private bucket object path.
    const docs = await prisma.document.findMany({
      where: { organizationId, deletedAt: null },
      select: { fileUrl: true },
    });

    if (docs.length > 0) {
      const storageAdmin = createAdminClient();
      await storageAdmin.storage
        .from("documents")
        .remove(docs.map((d) => d.fileUrl))
        .catch((e: Error) =>
          console.warn("[account/delete] Storage cleanup partial failure:", e.message)
        );
    }

    // 2. Delete ConsentLog records — not cascade-deleted by org deletion.
    await prisma.consentLog.deleteMany({ where: { userId: user.id } }).catch(() => {});

    // 3. DataErasureLog is a permanent audit trail — never deleted (per data retention policy).

    // 4. Delete Organization — cascades to all org-scoped tables.
    await prisma.organization.delete({ where: { id: organizationId } });

    // 5. Delete Prisma User row.
    await prisma.user.delete({ where: { id: user.id } });

    // 6. Delete from Supabase auth (requires service role).
    const authAdmin = createAdminClient();
    const { error: authDeleteError } = await authAdmin.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error("[account/delete] auth.admin.deleteUser failed:", authDeleteError.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/account/delete]", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
