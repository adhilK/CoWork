import { NextResponse } from "next/server";

// No auth — designed for uptime monitors (UptimeRobot, Betterstack, etc.).
// Returns 200 as long as the process is running.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
    },
    { status: 200 }
  );
}
