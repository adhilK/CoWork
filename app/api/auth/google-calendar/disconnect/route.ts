import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { apiError, apiSuccess } from "@/lib/utils";

/**
 * POST /api/auth/google-calendar/disconnect
 * Removes the stored refresh token, effectively disconnecting Google Calendar.
 */
export async function POST(_req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { googleCalendarRefreshToken: null },
  });

  return apiSuccess({ disconnected: true });
}
