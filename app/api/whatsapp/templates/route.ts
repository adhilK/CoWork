import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/utils";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
  category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]).default("UTILITY"),
  language: z.string().min(2).max(10).default("en"),
  body: z.string().min(1).max(1024),
  variables: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]).default("DRAFT"),
  isActive: z.boolean().default(true),
});

export async function GET(_req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const templates = await prisma.whatsAppTemplate.findMany({
    where: { organizationId: auth.organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess({ data: templates });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth) return apiError("Forbidden", 403);

  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
  const d = parsed.data;

  // Enforce unique name per org
  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { organizationId: auth.organizationId, name: d.name, deletedAt: null },
  });
  if (existing) return apiError("A template with this name already exists", 409);

  const template = await prisma.whatsAppTemplate.create({
    data: { organizationId: auth.organizationId, ...d },
  });

  return apiSuccess(template, 201);
}
