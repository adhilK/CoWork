import { redirect } from "next/navigation";
import { getAuthContext, getCurrentUser } from "@/lib/auth";

/**
 * Root page — route based on auth state AND role.
 *   Unauthenticated         → /login
 *   Authenticated, no org    → /onboarding
 *   MEMBER                    → /portal   (member portal)
 *   OWNER / ADMIN             → /dashboard (admin dashboard)
 */
export default async function RootPage() {
  const ctx = await getAuthContext();

  if (!ctx) {
    const user = await getCurrentUser();
    redirect(user ? "/onboarding" : "/login");
  }

  redirect(ctx.role === "MEMBER" ? "/portal" : "/dashboard");
}
