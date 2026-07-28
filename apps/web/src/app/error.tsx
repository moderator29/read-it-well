"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route level error boundary.
 *
 * Shows what happened and what to do next, and never leaks the raw error to the
 * user. The digest is surfaced because it is the id support needs to find the
 * matching server log, which is the whole point of having one.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replaced by the Sentry client once observability lands in Phase 1.
    console.error("[naijafinds] route error", error);
  }, [error]);

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      <div className="nf-card relative z-10 max-w-md p-9">
        <h1 className="nf-h2">Something went wrong</h1>
        <p className="mt-3 text-[var(--nf-content-secondary)]">
          This is on us, not on you. Try again, and if it keeps happening let support know.
        </p>

        {error.digest && (
          <p className="nf-numeric mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
            Reference {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="nf-btn nf-btn--primary">
            Try again
          </button>
          <Link href="/" className="nf-btn nf-btn--glass">
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
