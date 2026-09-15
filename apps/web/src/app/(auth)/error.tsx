"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

/**
 * The auth group's error boundary. There was none.
 *
 * A failure here used to fall all the way through to the root boundary, which
 * draws a full-screen branded page with its own logo lockup - on top of the
 * auth layout, which is ALSO a full-screen branded page with a logo lockup. Two
 * stacked brand pages, and every route out of the auth flow gone.
 *
 * This one stays inside the panel, so the aurora and the lockup behind it are
 * untouched and the person can still see they are on Vallo's sign-in screen.
 *
 * WHY THE COPY IS SPECIFIC. "Something went wrong" on an auth screen is
 * genuinely frightening: the two things a person immediately suspects are that
 * their password was wrong in some way that broke the page, or that their
 * account is gone. Neither is what a render failure means, so this says what it
 * does mean - nothing was submitted and no account changed - before it offers
 * the retry.
 *
 * The raw error never reaches the screen. `error.message` on an auth path is
 * exactly the kind of string that leaks whether an address exists. The digest
 * is shown instead: it finds the matching server log, which is the whole reason
 * Next generates one.
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[vallo] auth route error", error);
  }, [error]);

  return (
    <div className="text-center">
      <h1 className="nf-h3">This screen did not load</h1>
      <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
        Something on our side stopped part way through. Nothing was submitted, no
        account was created or changed, and your details are safe. Trying again
        usually settles it.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="primary" size="lg" full onClick={reset}>
          Try again
        </Button>
        <Link
          href="/"
          className="nf-tap py-2 text-[0.875rem] font-semibold text-[var(--nf-content-muted)] transition-colors hover:text-[var(--nf-content-primary)]"
        >
          Back to the home page
        </Link>
      </div>

      {error.digest && (
        <p className="nf-numeric mt-5 text-[0.75rem] text-[var(--nf-content-muted)]">
          Reference {error.digest}
        </p>
      )}
    </div>
  );
}
