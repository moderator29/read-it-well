import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import type { ProviderId, ProviderState } from "@/lib/auth/providers";
import { startGoogleOAuth } from "@/lib/auth/actions";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The door, to its governing image (`docs/design/references/55A56F21`).
 *
 * "Welcome back", the line under it, the email field with the envelope in
 * it, Continue, the OR rule, Continue with Google, and the sign-up link. The
 * sign-up screen is the same card with the words turned round.
 *
 * EMAIL FIRST, AND THE FIELD IS REAL. The render puts the address on the
 * first screen and the password on the next, which is the flow this platform
 * already runs: the chooser here, the form at `/sign-in/email`. So the field
 * is a form that posts the address forward as a query parameter, and the
 * email screen opens with it filled in and the cursor on the password. The
 * browser's back button still undoes the step, because it is still a route
 * and not an in-place expansion.
 *
 * GOOGLE IS DRAWN ONLY WHEN IT WORKS. `getProviderStates` says whether the
 * dashboard has the provider on; a row that can only fail is the same defect
 * as a Reserve button on a listing nobody can book, so with Google off the
 * rule and the row are simply not there and email is the way in. The row
 * posts to the real `startGoogleOAuth` action with the destination and the
 * intent, exactly as the callback expects them.
 *
 * A server component: every control is a link or a form posting to a server
 * action, so none of it needs to be shipped as JavaScript.
 */
export function AuthChoices({
  mode,
  t,
  providers,
  notice,
  next,
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  providers: ProviderState[];
  /** A message from the auth callback, for example an expired link. */
  notice?: string | undefined;
  /**
   * Where the person was going when the middleware stopped them, carried
   * through every route out of this screen so signing in returns them there
   * rather than dropping them on the home shelf. Validated again server side,
   * because a hidden field is an input like any other.
   */
  next?: string | undefined;
}) {
  const isSignUp = mode === "sign-up";
  const configured = (id: ProviderId) => providers.find((p) => p.id === id)?.configured ?? false;
  const emailReady = configured("email");
  const googleReady = configured("google");
  const emailRoute = isSignUp ? "/sign-up/email" : "/sign-in/email";

  return (
    <div className="w-full">
      <h1 className="nf-auth__title">{isSignUp ? t.auth.createAccount : t.auth.welcomeBack}</h1>
      <p className="nf-auth__sub">{isSignUp ? t.auth.signUpSub : t.auth.signInSub}</p>

      {notice ? (
        <p role="status" className="nf-auth__notice">
          {notice}
        </p>
      ) : null}

      {/*
        The address travels as a GET. Nothing is submitted to an action here:
        the email screen reads `email` off the URL to fill its field, and
        `next` rides along so the chain to the person's original destination
        does not break at this hop.
      */}
      <form action={emailRoute} method="get" className="mt-lg" noValidate={false}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <label htmlFor="auth-email" className="sr-only">
          {t.auth.emailLabel}
        </label>
        <div className="nf-auth-field">
          <span className="nf-auth-field__glyph" aria-hidden="true">
            <UiIcon name="mail" size={20} />
          </span>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            placeholder={t.auth.emailLabel}
            disabled={!emailReady}
            className="nf-field"
          />
        </div>

        {emailReady ? (
          <button type="submit" className="nf-btn nf-btn--primary nf-btn--lg nf-btn--full mt-sm">
            <span className="nf-btn__label">{t.common.continue}</span>
            <UiIcon name="arrow-right" size={20} />
          </button>
        ) : (
          <p className="nf-auth__terms">{t.auth.providerUnavailable}</p>
        )}
      </form>

      {googleReady && (
        <>
          <div className="nf-auth__rule" aria-hidden="true">
            {t.auth.orDivider}
          </div>
          <form action={startGoogleOAuth}>
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <input type="hidden" name="intent" value={mode} />
            <button type="submit" className="nf-auth__door nf-tap">
              {/* A typographic mark rather than the four-colour glyph: the
                  palette holds one blue family and nothing in this tree draws
                  a third party's colours. The word beside it says which door
                  this is. */}
              <span className="nf-auth__door-mark" aria-hidden="true">
                G
              </span>
              {t.auth.continueWithGoogle}
            </button>
          </form>
        </>
      )}

      <p className="nf-auth__swap">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link href={isSignUp ? "/sign-in" : "/sign-up"}>
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      {/* The intro for a first visit, kept as a quiet door beside the
          sign-up link rather than a toll before it. */}
      {isSignUp && (
        <p className="nf-auth__swap mt-xs">
          <Link href="/start">{t.welcomeCards.label}</Link>
        </p>
      )}

      {/*
        THE NOTICE NAMES ALL THREE DOCUMENTS NOW, AND THE THIRD ONE EXISTS.

        This line used to be `t.auth.termsNotice` alone: "By continuing you
        agree to our Terms and Privacy Policy", with nothing linked and no
        Community Rules to link to. The ACTIVE acceptance, a required tick
        recorded against a version, lives on the email sign-up form, which is
        where an account is actually created from this product's own system.

        SAID PLAINLY BECAUSE IT IS NOT CLOSED: a person who creates their
        account through a social provider from this screen passes no tick, so
        `profiles.terms_accepted_at` stays null for them. Closing that needs
        the social buttons themselves reworked, and this week those belong to
        another worker. It is recorded in the build ledger rather than left to
        be discovered.
      */}
      <p className="nf-auth__terms">
        {t.auth.termsNotice} {t.safety.acceptRead}{" "}
        <Link href="/terms">{t.safety.termsLink}</Link>
        {", "}
        <Link href="/privacy">{t.safety.privacyLink}</Link>
        {", "}
        <Link href="/eula">{t.safety.rulesLink}</Link>
      </p>
    </div>
  );
}
