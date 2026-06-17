import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@/lib/utils";
import { resend, emailFrom } from "@/lib/resend";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Throttle to prevent password-reset email bombing of a victim's inbox.
  const limit = rateLimit(req, { key: "password-reset", limit: 5, windowMs: 15 * 60_000 });
  if (!limit.ok) return rateLimitResponse(limit);

  const { email } = await req.json();
  if (!email || typeof email !== "string") return apiError("Email required");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabaseAdmin = createAdminClient();

  // Generate a recovery link server-side so we get hashed_token directly.
  // This avoids the PKCE verifier problem: no localStorage required.
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  if (error || !data?.properties?.hashed_token) {
    // Don't reveal whether the email exists — always return success to client
    console.error("[request-password-reset]", error?.message);
    return apiSuccess({ ok: true });
  }

  const tokenHash = data.properties.hashed_token;
  const resetLink = `${appUrl}/reset-password?token_hash=${tokenHash}&type=recovery`;

  // Send branded email via Resend
  if (resend) {
    try {
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: "Reset your Maktaby password",
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;background:#f8fafc;padding:32px 0;">
            <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
              <div style="background:linear-gradient(135deg,#0f172a,#15803d);padding:20px 28px;">
                <span style="color:#fff;font-weight:700;font-size:16px;">Maktaby</span>
              </div>
              <div style="padding:28px;">
                <h1 style="font-size:18px;color:#0f172a;margin:0 0 16px;">Reset your password</h1>
                <p style="color:#475569;font-size:14px;margin:0 0 24px;">
                  Click the button below to set a new password. This link expires in 1 hour.
                </p>
                <a href="${resetLink}"
                   style="display:inline-block;background:#15803D;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin-bottom:24px;">
                  Reset password →
                </a>
                <p style="color:#94a3b8;font-size:12px;margin:0;">
                  If you didn't request this, you can ignore this email.
                </p>
              </div>
            </div>
          </div>`,
      });
    } catch (e) {
      console.error("[request-password-reset] email send failed:", e);
    }
  }

  // Always respond with success — never confirm whether email exists
  return apiSuccess({ ok: true });
}
