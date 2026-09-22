"use client";

import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";

/**
 * The tick that turns a notice into an acceptance.
 *
 * WHAT WAS THERE BEFORE. "By continuing you agree to our Terms and Privacy
 * Policy", printed under the button. Nobody agreed to anything; they were
 * told, afterwards, that they had. There was no record of it, no version
 * against it, and the Community Rules did not exist to be agreed to.
 *
 * Apple's guideline 1.2 asks in its published text for four precautions and
 * says nothing about an agreement. The requirement for one, and for the words
 * about objectionable content, comes from the rejection message App Review
 * sends rather than from the guidelines page; that is recorded honestly in
 * `lib/legal/eula.tsx`. Either way, a marketplace where two strangers arrange
 * to meet at a property should be able to say what somebody agreed to and
 * when, so this is worth having on its own terms.
 *
 * WHAT THIS COMPONENT IS AND IS NOT. It is the control and the hidden version
 * field. It is NOT the enforcement: the form it sits in refuses to submit
 * until it is ticked, and `public.profiles.terms_accepted_at` is written by
 * the sign-up trigger only when a version arrived with the metadata, so a
 * request assembled by hand without the field records no acceptance rather
 * than a false one.
 */

/**
 * The version string recorded against an acceptance.
 *
 * It is the date the three documents last changed together, not a number, so
 * a row in `profiles.terms_version` says which text was on screen without
 * anybody having to keep a separate table of what version meant what. Change
 * it whenever the Terms, the Privacy policy or the Community Rules change in
 * a way a person should be asked about again.
 */
export const TERMS_VERSION = "2026-09-22";

export function AcceptTerms({
  t,
  accepted,
  onChange,
  showError,
}: {
  t: Dictionary;
  accepted: boolean;
  onChange: (next: boolean) => void;
  /** True once a submit has been refused for want of the tick. */
  showError: boolean;
}) {
  return (
    <div className="mt-md text-left">
      <label className="flex cursor-pointer items-start gap-sm">
        <input
          type="checkbox"
          name="acceptTerms"
          data-testid="accept-terms"
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={showError ? "accept-terms-error" : undefined}
          className="mt-3xs h-5 w-5 shrink-0 accent-[var(--nf-brand-primary)]"
        />
        <span className="text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.safety.acceptLabel}
        </span>
      </label>

      {/* The documents themselves, as three links rather than three links
          buried inside the sentence, so the sentence stays translatable as one
          sentence in all four locales. */}
      <p className="mt-2xs pl-lg text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
        {t.safety.acceptRead}{" "}
        <Link href="/terms" className="underline underline-offset-4">
          {t.safety.termsLink}
        </Link>
        {", "}
        <Link href="/privacy" className="underline underline-offset-4">
          {t.safety.privacyLink}
        </Link>
        {", "}
        <Link href="/eula" className="underline underline-offset-4">
          {t.safety.rulesLink}
        </Link>
      </p>

      {/* The version travels with the form, so the trigger records WHAT was
          accepted rather than only that something was. */}
      {accepted && <input type="hidden" name="termsVersion" value={TERMS_VERSION} />}

      {showError && (
        <p
          id="accept-terms-error"
          role="alert"
          className="mt-2xs text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {t.safety.acceptRequired}
        </p>
      )}
    </div>
  );
}
