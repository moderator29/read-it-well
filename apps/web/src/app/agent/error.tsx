"use client";

import { useEffect } from "react";
import { MomentScreen } from "@/components/app/MomentScreen";
import { Button, ButtonLink } from "@/components/ui/Button";

/**
 * Agent Mode's error boundary.
 *
 * Agent Mode has no `layout.tsx` - every page renders `AgentShell` itself - so
 * unlike Personal Mode and the console, this boundary genuinely does replace the
 * whole screen including the rail. It is therefore written as a standalone
 * surface rather than as a panel inside chrome that is not there.
 *
 * The consequence shapes the actions: an agent who lands here has lost their
 * navigation, so the secondary action returns them to the dashboard, which is
 * the one route that rebuilds the shell. Sending them to the guest home instead
 * would drop them out of Agent Mode entirely.
 *
 * The copy is written for someone whose livelihood is on the other side of this
 * screen: it says what did not happen, states plainly that nothing was lost, and
 * never shows them a stack trace.
 */
export default function AgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rentme] agent route error", error);
  }, [error]);

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-5 py-10"
    >
      <MomentScreen
        variant="warning"
        icon="shield-lock"
        title="We could not open that workspace"
        description="A read on our side did not complete. Your listings, bookings and earnings are untouched - this is the page failing to load them, not the records themselves."
        actions={
          <>
            <Button variant="primary" size="lg" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href="/agent/dashboard" variant="secondary" size="lg">
              Back to dashboard
            </ButtonLink>
          </>
        }
        footnote={
          error.digest ? (
            <span className="nf-numeric">Reference {error.digest}</span>
          ) : null
        }
      />
    </main>
  );
}
