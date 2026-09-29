"use client";

import { LogoMark } from "@/design-system/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { useClientCopy } from "@/lib/i18n/client-copy";

/**
 * The moment between tapping and being inside, and the bar under it.
 *
 * One component, drawn by every way in. Confirming by link and confirming by
 * code are the same event to the person doing it, and the moment they see has
 * to be the same moment or the platform feels like two products stitched
 * together. Whoever renders this is responsible for how long it stays; the
 * floor is two seconds and it is stated where each caller navigates.
 *
 * **What it says depends on what is happening.** It said "Verifying your
 * email" to everybody, and everybody includes a person who has had an account
 * for a month and just tapped Continue with Google to SIGN IN. Nothing of
 * theirs is being verified; they are being let back in, and being told
 * otherwise is the platform describing an event that is not taking place. The
 * owner caught it on his own login.
 *
 * Both sign-in and sign-up land on the same callback, because the OAuth
 * handshake is identical either way, so the words cannot be inferred at this
 * end. The intent travels from the button that started it.
 */
export type AuthMoment = "sign-in" | "sign-up";


export function VerifyingPanel({ moment = "sign-up" }: { moment?: AuthMoment }) {
  const a = useClientCopy().authFlow;
  const words =
    moment === "sign-up"
      ? { title: a.verifyingTitle, body: a.verifyingBody }
      : { title: a.signingInTitle, body: a.signingInBody };
  return (
    <div className="w-full max-w-[24rem] text-center" data-testid="verifying" aria-live="polite">
      <span className="flex justify-center">
        <LogoMark size={44} title="Vallo" />
      </span>
      <h1 className="nf-h2 mt-5">{words.title}</h1>
      <p className="mt-3 leading-relaxed text-[var(--nf-content-secondary)]">{words.body}</p>
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

      {/* The way out without JavaScript, and it is only a way out for a
          sign-up: the six digit code confirms an address, and somebody signing
          back in has no address to confirm. They are sent to the form instead,
          which needs nothing but a password. */}
      <noscript>
        {moment === "sign-up" ? (
          <>
            <p className="mt-7 leading-relaxed text-[var(--nf-content-secondary)]">
              {a.noScriptSignUp}
            </p>
            <ButtonLink href="/sign-up/verify" variant="primary" size="lg" className="mt-5">
              {a.enterCodeInstead}
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="mt-7 leading-relaxed text-[var(--nf-content-secondary)]">
              {a.noScriptSignIn}
            </p>
            <ButtonLink href="/sign-in" variant="primary" size="lg" className="mt-5">
              {a.signInWithYourEmail}
            </ButtonLink>
          </>
        )}
      </noscript>
    </div>
  );
}
