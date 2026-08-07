"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogoMark } from "@/design-system/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import type { VerificationOutcome } from "@/lib/auth/actions";

/**
 * The moment after somebody taps the button in their email.
 *
 * This used to be nothing at all. `/auth/callback` was a route handler that
 * exchanged the code and answered with a 307, so the browser sat on a blank
 * white document for however long the round trip took and then jumped. On a
 * good connection that is a flicker. On a Nigerian mobile connection it is a
 * second or two of a page that appears to have failed, at the exact moment
 * somebody is deciding whether this platform works.
 *
 * So the screen exists, it says what is happening, and then it takes them in.
 *
 * It also does something the route handler could not. The implicit flow puts
 * the session in the URL FRAGMENT, and a fragment never leaves the browser: a
 * server literally cannot see it. Anybody arriving that way was told their link
 * had expired. Reading it needs code running in the page, which is what this
 * is.
 *
 * WITHOUT JAVASCRIPT this screen cannot finish, and it says so rather than
 * sitting on "Verifying" forever. Reading a fragment and writing a session both
 * need code running here. The `<noscript>` below sends those readers to the six
 * digit code instead, which is a plain form and needs nothing.
 */

export function Verifying({
  code,
  tokenHash,
  type,
  next,
  complete,
}: {
  code?: string | undefined;
  tokenHash?: string | undefined;
  type?: string | undefined;
  next?: string | undefined;
  complete: (input: {
    code?: string | undefined;
    tokenHash?: string | undefined;
    type?: string | undefined;
    accessToken?: string | undefined;
    refreshToken?: string | undefined;
    next?: string | undefined;
  }) => Promise<VerificationOutcome>;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState<Extract<VerificationOutcome, { ok: false }> | null>(null);
  /* Runs once. A second call would exchange a code that has already been
     spent, which comes back as an error and would turn a success into an
     expired-link screen. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    /* The fragment, if this is the implicit flow. Read before anything else
       touches the URL, and cleared from the address bar afterwards so a
       session token is not left sitting in history. */
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token") ?? undefined;
    const refreshToken = hash.get("refresh_token") ?? undefined;
    if (accessToken) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }

    void complete({ code, tokenHash, type, accessToken, refreshToken, next }).then((result) => {
      if (result.ok) {
        router.replace(result.next);
        /* The tree behind this screen was rendered signed out. */
        router.refresh();
        return;
      }
      setFailed(result);
    });
  }, [code, tokenHash, type, next, complete, router]);

  if (failed) {
    const said =
      failed.reason === "unconfigured"
        ? "This platform is not holding its email keys yet, so nothing could be confirmed. Nothing is wrong with your account."
        : failed.reason === "invalid"
          ? "That link is missing the part that confirms who it belongs to. It may have been cut in half by an email client."
          : "That link has expired or has already been used. Confirmation links are good for one visit.";

    return (
      <div className="w-full max-w-[26rem] text-center" data-testid="verify-failed">
        {/* Its own centring wrapper. `text-center` centres inline content and
            the mark renders as a block, so it hung on the left edge above a
            centred column. */}
        <span className="flex justify-center">
          <LogoMark size={44} title="RentMe" />
        </span>
        <h1 className="nf-h2 mt-5">We could not confirm that link</h1>
        <p className="mt-3 leading-relaxed text-[var(--nf-content-secondary)]">{said}</p>
        <p className="mt-3 leading-relaxed text-[var(--nf-content-secondary)]">
          The same email carries a six digit code, and that one does not expire on opening.
        </p>
        <ButtonLink href="/sign-up/verify" variant="primary" size="lg" className="mt-7">
          Enter the code instead
        </ButtonLink>
        <p className="mt-5 text-[0.8125rem] text-[var(--nf-content-muted)]">
          <Link
            href="/sign-in"
            className="underline-offset-4 hover:text-[var(--nf-content-secondary)] hover:underline"
          >
            Already confirmed? Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[24rem] text-center" data-testid="verifying" aria-live="polite">
      <span className="flex justify-center">
        <LogoMark size={44} title="RentMe" />
      </span>
      <h1 className="nf-h2 mt-5">Verifying your email</h1>
      <p className="mt-3 leading-relaxed text-[var(--nf-content-secondary)]">
        One moment. We are confirming your address and opening your account.
      </p>
      {/* A determinate-looking bar rather than a spinner: this has a known end,
          and a bar says so where a spinner says only that something is
          happening. Purely decorative, so the sentence above carries it for a
          screen reader. */}
      <span
        aria-hidden="true"
        className="mx-auto mt-7 block h-1 w-40 overflow-hidden rounded-full bg-[var(--nf-border-subtle)]"
      >
        <span className="nf-verify-sweep block h-full w-1/3 rounded-full bg-[var(--nf-brand-primary)]" />
      </span>

      <noscript>
        <p className="mt-7 leading-relaxed text-[var(--nf-content-secondary)]">
          This step needs JavaScript to finish. The same email carries a six digit code, and
          entering it needs nothing but the form.
        </p>
        <ButtonLink href="/sign-up/verify" variant="primary" size="lg" className="mt-5">
          Enter the code instead
        </ButtonLink>
      </noscript>
    </div>
  );
}
