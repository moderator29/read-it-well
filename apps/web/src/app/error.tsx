"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { LogoMark } from "@/design-system/brand/Logo";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Route level error boundary.
 *
 * Same family as the 404: calm, branded, and it never leaks the raw error to
 * the user. The digest is surfaced because it is the id support needs to find
 * the matching server log, which is the whole point of having one.
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
    console.error("[vallo] route error", error);
  }, [error]);

  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 text-center"
    >
      <div className="nf-aurora" aria-hidden="true" />

      {/* Floating decorative objects */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="nf-float absolute left-[10%] top-[18%] block h-14 w-14 opacity-20 md:h-16 md:w-16">
          <BrandIcon name="support-chat" fill />
        </span>
        {/*
          F2-027's third error boundary, and the last padlock on a crash.

          This drew `shield-lock` here. The `(app)` and `admin` boundaries both
          had the same object and both lost it, for the reason written out in
          `(app)/error.tsx`: a padlock shield on a screen that failed to load
          tells somebody THEIR ACCOUNT IS LOCKED, which is far more alarming
          than the truth and is not true. This one is decoration at 20 per cent
          rather than the verdict mark, which makes it quieter and not
          different: it is the only brand object on the screen besides the
          support glyph, and what a reader takes from a crash page is the
          shapes on it.

          `alert-triangle` is what the other two boundaries settled on, so all
          three now say the same thing with the same object.
        */}
        <span className="nf-float-slow absolute bottom-[20%] right-[10%] block h-14 w-14 opacity-20 md:h-16 md:w-16">
          <BrandIcon name="alert-triangle" fill />
        </span>
      </div>

      <div className="relative z-10">
        <Link href="/" aria-label="Vallo home" className="nf-tap inline-flex">
          <LogoMark size={56} />
        </Link>

        <div className="nf-card mx-auto mt-6 max-w-md p-9">
          <h1 className="nf-h2">Something went wrong</h1>
          <p className="mt-3 text-[var(--nf-content-secondary)]">
            This is on us, not on you. Try again, and if it keeps happening let
            support know.
          </p>

          {error.digest && (
            <p className="nf-numeric mt-4 text-[0.75rem] text-[var(--nf-content-muted)]">
              Reference {error.digest}
            </p>
          )}

          <div className="mt-7 flex flex-wrap justify-center gap-4">
            <Button variant="primary" onClick={reset}>
              Try again
            </Button>
            {/* Not "/". An error boundary is a client component by requirement,
                so it cannot read a session and the auth cookies are httpOnly by
                design. This route answers the question on the server and sends
                the reader to whichever home is actually theirs. */}
            <ButtonLink href="/home-or-landing" variant="secondary">
              Back to home
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
