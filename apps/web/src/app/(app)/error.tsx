"use client";

import { useEffect } from "react";
import { MomentScreen } from "@/components/app/MomentScreen";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Personal Mode's error boundary.
 *
 * There was one error boundary on the platform, at the app root, and it draws a
 * full-screen branded page with its own logo. That is right for a failure that
 * takes the whole application down, and wrong for a failure inside one screen:
 * it throws away the rail and the tab bar, so a wallet read that timed out looks
 * identical to the entire product falling over, and the user loses every way
 * onward except the two buttons in front of them.
 *
 * This boundary sits inside the `(app)` layout, so the chrome stays put and only
 * the content area is replaced. The recovery is `reset()`, which re-runs the
 * failed segment in place - for a dropped connection, which is the common case
 * here, that is genuinely all it takes.
 *
 * The raw error never reaches the screen. `error.message` on a server component
 * failure is either a stack-shaped string that means nothing to a guest or a
 * detail about the database that should not be published. The digest is shown
 * instead: it is the id that finds the matching server log, which is the entire
 * reason Next generates one.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Console until observability lands, matching the root boundary. The full
       error object goes here and nowhere near the rendered output. */
    console.error("[rentme] app route error", error);
  }, [error]);

  return (
    <MomentScreen
      variant="warning"
      icon="shield-lock"
      title="That screen did not load"
      description="Something on our side stopped part way through. Nothing you were doing was lost, and trying again usually settles it."
      actions={
        <>
          <Button variant="primary" size="lg" onClick={reset}>
            Try again
          </Button>
          <ButtonLink href="/home" variant="secondary" size="lg">
            Back to home
          </ButtonLink>
        </>
      }
      footnote={
        error.digest ? (
          <span className="nf-numeric">Reference {error.digest}</span>
        ) : null
      }
    />
  );
}
