"use client";

import { useErrorReport } from "@/lib/observability/use-error-report";
import { useClientCopy } from "@/lib/i18n/client-copy";
import { AuthPillButton, AuthPillLink } from "@/components/auth/slate";
import "@/app/css/auth.css";

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
  const a = useClientCopy().authFlow;
  const reference = useErrorReport(error, "client.auth_boundary", "[vallo] auth route error");

  /* The same grammar as every other door (R3-09): the title, the sentence,
     the one primary pill and the quiet second way, then the reference as
     the small print. It used to be a hand-sized block of its own, the one
     screen in the group that did not look like the others. */
  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{a.errorTitle}</h1>
      <p className="nf-auth__sub">{a.errorBody}</p>
      <div className="nf-auth__form">
        <AuthPillButton onClick={reset} className="nf-auth__cta">
          {a.tryAgain}
        </AuthPillButton>
        <AuthPillLink href="/" quiet>
          {a.backHome}
        </AuthPillLink>
      </div>
      <p className="nf-auth__hint nf-auth__reference nf-numeric">{a.reference.replace("{digest}", reference)}</p>
    </div>
  );
}
