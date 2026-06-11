import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapMetaStatus } from "@/lib/whatsapp";

/**
 * Meta WhatsApp webhook.
 *
 * GET  — verification handshake. Meta sends hub.mode/hub.verify_token/hub.challenge.
 *        We accept if the token matches ANY org's verifyToken or the platform env
 *        verify token.
 * POST — inbound messages and delivery-status callbacks. The payload's
 *        metadata.phone_number_id maps to the owning org's WhatsAppConfig.
 */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");

  if (mode !== "subscribe" || !token) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Platform-level token match
  if (process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  // Per-org token match
  const config = await prisma.whatsAppConfig.findFirst({ where: { verifyToken: token } });
  if (config) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      const changes = entry?.changes ?? [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const phoneNumberId: string | undefined = value?.metadata?.phone_number_id;
        if (!phoneNumberId) continue;

        // Resolve the org from the receiving phone number id.
        const config = await prisma.whatsAppConfig.findFirst({
          where: { phoneNumberId },
        });
        // Fall back to env-configured single tenant
        let organizationId = config?.organizationId ?? null;
        if (!organizationId && process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId) {
          const anyOrg = await prisma.organization.findFirst({ select: { id: true } });
          organizationId = anyOrg?.id ?? null;
        }
        if (!organizationId) continue;

        // ── Inbound messages ──────────────────────────────────────────────
        const messages = value?.messages ?? [];
        for (const msg of messages) {
          const from: string = msg.from; // E.164 digits, no +
          const waMessageId: string = msg.id;
          let content = "";
          let mediaUrl: string | null = null;

          if (msg.type === "text") {
            content = msg.text?.body ?? "";
          } else if (msg.type === "image" || msg.type === "document" || msg.type === "audio" || msg.type === "video") {
            content = msg[msg.type]?.caption ?? `[${msg.type}]`;
            mediaUrl = msg[msg.type]?.id ?? null; // Meta media id (download separately)
          } else if (msg.type === "button") {
            content = msg.button?.text ?? "[button reply]";
          } else if (msg.type === "interactive") {
            content =
              msg.interactive?.button_reply?.title ??
              msg.interactive?.list_reply?.title ??
              "[interactive reply]";
          } else {
            content = `[${msg.type}]`;
          }

          // Dedupe by waMessageId
          const exists = await prisma.whatsAppMessage.findFirst({ where: { waMessageId } });
          if (exists) continue;

          // Try to attribute to a member by their WhatsApp number.
          const member = await prisma.member.findFirst({
            where: {
              organizationId,
              deletedAt: null,
              whatsAppNumber: { contains: from.slice(-9) }, // match on last 9 digits
            },
            select: { id: true },
          });

          await prisma.whatsAppMessage.create({
            data: {
              organizationId,
              memberId: member?.id ?? null,
              phone: from,
              direction: "INBOUND",
              messageType: "SUPPORT_MESSAGE",
              content,
              mediaUrl,
              waMessageId,
              status: "DELIVERED",
              sentAt: msg.timestamp ? new Date(Number(msg.timestamp) * 1000) : new Date(),
            },
          });
        }

        // ── Delivery / read status updates ───────────────────────────────
        const statuses = value?.statuses ?? [];
        for (const st of statuses) {
          const waMessageId: string = st.id;
          const mapped = mapMetaStatus(st.status);
          if (!mapped) continue;

          const existing = await prisma.whatsAppMessage.findFirst({
            where: { organizationId, waMessageId },
          });
          if (!existing) continue;

          const data: any = { status: mapped };
          if (mapped === "DELIVERED" && !existing.deliveredAt) data.deliveredAt = new Date();
          if (mapped === "READ" && !existing.readAt) {
            data.readAt = new Date();
            if (!existing.deliveredAt) data.deliveredAt = new Date();
          }
          if (mapped === "FAILED") {
            data.failedReason = st.errors?.[0]?.title ?? st.errors?.[0]?.message ?? "Delivery failed";
          }

          await prisma.whatsAppMessage.update({ where: { id: existing.id }, data });
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp webhook] processing error:", err);
    // Always 200 so Meta does not retry-storm on a transient error.
  }

  return NextResponse.json({ received: true });
}
