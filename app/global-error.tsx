"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Capture unhandled errors that bubble past all route-level boundaries.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
          <p className="mt-2 text-gray-500">Our team has been notified. Please try again.</p>
          <button
            onClick={reset}
            className="mt-6 rounded-md bg-green-700 px-4 py-2 text-sm text-white hover:bg-green-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
