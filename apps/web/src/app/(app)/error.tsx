"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { reportClientError } from "@/lib/observability/client";
import { SystemMoment } from "../offline/SystemMoment";

/**
 * Personal Mode's error boundary: the brand moment, inside the chrome.
 *
 * This boundary sits inside the `(app)` layout, so the header and the dock
 * stay put and only the content area is replaced: a wallet read that timed
 * out must not look identical to the entire product falling over, and the
 * reader keeps every way onward. Inside that area the moment is the same
 * object as the root boundary's, the plate, the glass card with its lit rim,
 * the podium, with the tile alone for the brand because the header above
 * already carries the wordmark.
 *
 * The recovery is `reset()`, which re-runs the failed segment in place. For
 * a dropped connection, the common case here, that is genuinely all it
 * takes.
 *
 * The raw error never reaches the screen. `error.message` on a server
 * component failure is either a stack-shaped string that means nothing to
 * a guest or a detail about the database that should not be published. The
 * digest is shown instead: it is the id that finds the matching server log,
 * which is the entire reason Next generates one.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* The full error object goes to the console and nowhere near the
       rendered output. The report beside it is scrubbed before it leaves the
       server and is silent when `SENTRY_DSN` is unset, matching the root
       boundary. */
    console.error("[vallo] app route error", error);
    reportClientError(error, { kind: "client.app_boundary", digest: error.digest });
  }, [error]);

  return (
    <SystemMoment home="/home" inset>
      <p className="nf-system__overline">Something went wrong</p>
      <h1 className="nf-system__title">That screen did not load</h1>
      <p className="nf-system__body">
        Something on our side stopped part way through. Nothing you were doing
        was lost, and trying again usually settles it.
      </p>

      {error.digest && (
        <p className="nf-system__ref">Reference {error.digest}</p>
      )}

      <div className="nf-system__actions">
        <Button variant="primary" size="lg" full onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/home" variant="secondary" size="lg" full>
          Back to home
        </ButtonLink>
      </div>
    </SystemMoment>
  );
}
