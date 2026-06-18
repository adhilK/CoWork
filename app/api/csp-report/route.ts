import { NextRequest, NextResponse } from "next/server";
import { captureServerError } from "@/lib/observability";

// Browsers POST violation reports with Content-Type: application/csp-report
// (a JSON body, but NOT application/json — must read as text then parse).
// We return 204 No Content — browsers ignore the response body.
export const dynamic = "force-dynamic";

type CspReport = {
  "csp-report": {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    "status-code"?: number;
    disposition?: string;
    referrer?: string;
  };
};

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const body = JSON.parse(text) as CspReport;
    const report = body["csp-report"] ?? {};

    const violated = report["violated-directive"] ?? report["effective-directive"] ?? "unknown";
    const blocked = report["blocked-uri"] ?? "unknown";
    const source = report["source-file"] ?? report["document-uri"] ?? "unknown";

    // Ignore browser-extension injections — these are noise, not real violations.
    if (
      blocked === "about" ||
      blocked === "inline" ||
      blocked.startsWith("chrome-extension://") ||
      blocked.startsWith("moz-extension://")
    ) {
      return new NextResponse(null, { status: 204 });
    }

    // Log as structured JSON to Vercel logs (greppable with: level=csp-violation).
    console.warn(
      JSON.stringify({
        level: "csp-violation",
        violated,
        blocked,
        source,
        line: report["line-number"],
        col: report["column-number"],
        disposition: report.disposition ?? "report",
        ts: new Date().toISOString(),
      })
    );

    // Surface repeated violations to Sentry as a grouped issue so we can
    // see at a glance which directives would fire most when we enforce.
    // Treat as a warning-level event, not an error — these are expected during
    // the report-only phase and should not page anyone.
    if (process.env.NODE_ENV === "production") {
      captureServerError(
        new Error(`CSP violation: ${violated} blocked ${blocked}`),
        {
          violated_directive: violated,
          blocked_uri: blocked,
          source_file: source,
          disposition: report.disposition ?? "report",
        }
      );
    }
  } catch {
    // Malformed report body — ignore silently.
  }

  return new NextResponse(null, { status: 204 });
}
