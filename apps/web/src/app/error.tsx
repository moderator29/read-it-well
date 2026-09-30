"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { useErrorReport } from "@/lib/observability/use-error-report";
import { SystemMoment } from "./offline/SystemMoment";

/**
 * Route level error boundary: the brand moment.
 *
 * The lockup over the aurora plate, one glass card, an honest sentence, the
 * reference, and two ways on. Same anatomy as the sign-in render, because a
 * crash is the one screen where the product has nothing to show but itself,
 * and it should look like itself rather than like a browser.
 *
 * The raw error never reaches the screen. The digest is surfaced because it
 * is the id support needs to find the matching server log, which is the
 * whole point of having one.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  /* Logs to the console (the only record when `SENTRY_DSN` is unset), sends
     the scrubbed report, and returns the short reference (C13). */
  const reference = useErrorReport(error, "client.route_boundary", "[vallo] route error");

  return (
    /* The lockup links to `/home-or-landing`, not `/`. An error boundary is
       a client component by requirement, so it cannot read a session and the
       auth cookies are httpOnly by design. That route answers the question
       on the server and sends the reader to whichever home is theirs. */
    <SystemMoment home="/home-or-landing">
      <p className="nf-system__overline">Something went wrong</p>
      <h1 className="nf-system__title">This screen did not load</h1>
      <p className="nf-system__body">
        Something stopped part way through. Anything you had typed on this
        screen may need typing again, and trying again usually settles it.{" "}
        If it keeps happening, tell support and quote the reference below.
      </p>

      <p className="nf-system__ref">
        Reference <span className="nf-numeric select-all">{reference}</span>. Quote this to support.
      </p>

      <div className="nf-system__actions">
        <Button variant="primary" size="lg" full onClick={reset}>
          Try again
        </Button>
        <ButtonLink href="/home-or-landing" variant="secondary" size="lg" full>
          Back to home
        </ButtonLink>
      </div>
    </SystemMoment>
  );
}
