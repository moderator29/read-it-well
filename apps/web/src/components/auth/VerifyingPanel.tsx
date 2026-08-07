"use client";

import { LogoMark } from "@/design-system/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";

/**
 * "Verifying your email", and the bar under it.
 *
 * One component, drawn by both ways in. Confirming by link and confirming by
 * code are the same event to the person doing it, and the moment they see has
 * to be the same moment or the platform feels like two products stitched
 * together. Whoever renders this is responsible for how long it stays; the
 * floor is two seconds and it is stated where each caller navigates.
 */
export function VerifyingPanel() {
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
