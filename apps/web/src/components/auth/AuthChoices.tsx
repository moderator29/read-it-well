import Image from "next/image";
import Link from "next/link";
import { withNext } from "@/lib/auth/next-link";
import type { Dictionary } from "@vallo/i18n/core";
import type { ProviderId, ProviderState, SignInSurface } from "@/lib/auth/providers";
import { startAppleOAuth, startGoogleOAuth } from "@/lib/auth/actions";
import { AppleMark, NativeAppleSignIn } from "./NativeAppleSignIn";
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
  surface = "web",
}: {
  mode: "sign-in" | "sign-up";
  t: Dictionary;
  providers: ProviderState[];
  /** Which surface the server rendered for. The redirect doors are drawn
      only on the website; inside a shell they cannot complete (STORE-03). */
  surface?: SignInSurface;
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
  const googleReady = configured("google") && surface === "web";
  const appleReady = configured("apple");
  const emailRoute = isSignUp ? "/sign-up/email" : "/sign-in/email";

  return (
    /* `nf-auth--narrow`: this card is drawn at the render's measured width
       (ledger R-C); the stage reads it with `:has()`. */
    <div className="nf-auth--narrow w-full">
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
      <form action={emailRoute} method="get" className="nf-auth__form" noValidate={false}>
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
            className="nf-field nf-field--glass nf-auth-input"
          />
        </div>

        {emailReady ? (
          <button type="submit" className="nf-btn nf-btn--primary nf-btn--full nf-auth__cta">
            <span className="nf-btn__label">{t.common.continue}</span>
            <UiIcon name="arrow-right" size={20} />
          </button>
        ) : (
          <p className="nf-auth__notice">{t.auth.providerUnavailable}</p>
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
            <button type="submit" className="nf-btn nf-btn--glass nf-btn--full nf-auth__door">
              {/*
                THE GOOGLE G, IN GOOGLE'S OWN FOUR COLOURS, and it is the one
                place the house palette steps aside. The render draws it this
                way, and Google's sign-in branding rules require the standard
                mark on a "Continue with Google" control. It is a third party's
                logo standing for that party, the same exception the catalogue
                makes for the Verve card mark. Nothing else on the screen takes
                these colours.
              */}
              <GoogleMark />
              {t.auth.continueWithGoogle}
            </button>
          </form>
        </>
      )}

      {appleReady && (
        <>
          {!googleReady && (
            <div className="nf-auth__rule" aria-hidden="true">
              {t.auth.orDivider}
            </div>
          )}
          {surface === "ios-native" ? (
            <NativeAppleSignIn label={t.auth.continueWithApple} next={next} />
          ) : surface === "web" ? (
            <form action={startAppleOAuth} className={googleReady ? "mt-sm" : undefined}>
              {next ? <input type="hidden" name="next" value={next} /> : null}
              <input type="hidden" name="intent" value={mode} />
              <button type="submit" className="nf-btn nf-btn--glass nf-btn--full nf-auth__door">
                <AppleMark />
                {t.auth.continueWithApple}
              </button>
            </form>
          ) : null}
        </>
      )}

      <p className="nf-auth__swap">
        {isSignUp ? t.auth.haveAccount : t.auth.newToVallo}{" "}
        {/* The other door keeps the destination too (audit UX-02, R16):
            a stranger who arrived to sign in and chose to make an account
            instead used to lose the thing that was shared with them here. */}
        <Link href={withNext(isSignUp ? "/sign-in" : "/sign-up", next)}>
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      {/* The intro for a first visit, kept as a quiet door beside the
          sign-up link rather than a toll before it. It goes to first run with
          this door as the way back (request W2), not to `/start`, which is a
          redirect and was prefetched on every render of this card. */}
      {isSignUp && (
        <p className="nf-auth__swap mt-xs">
          <Link href={`/welcome?next=${encodeURIComponent(withNext("/sign-up", next))}`} prefetch={false}>
            {t.welcomeCards.label}
          </Link>
        </p>
      )}

    </div>
  );
}

/**
 * Google's standard "G". It lives as a file under `public/brand/third-party/`
 * because its four colours are Google's and not ours: the house lint refuses a
 * raw hex in a component, rightly, and this mark is the one thing on the
 * screen that must not follow the theme.
 */
function GoogleMark() {
  return (
    <Image
      src="/brand/third-party/google-g.svg"
      alt=""
      width={20}
      height={20}
      className="nf-auth__door-mark"
      unoptimized
    />
  );
}
