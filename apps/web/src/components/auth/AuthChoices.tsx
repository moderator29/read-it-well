import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import type { ProviderId, ProviderState } from "@/lib/auth/providers";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * How you want to get in. One row, and nothing else on the screen.
 *
 * It was three. Google and Apple sat under email behind their own brand marks
 * and both were disabled, because neither provider is switched on and RentMe
 * does not offer third-party sign in. Two dead controls and an apology are
 * worse than an empty space, so all three are gone and email is simply the way
 * in.
 *
 * The choice and the form are two routes. This page offers the way in; email
 * opens `/sign-up/email` (or `/sign-in/email`) where the form has the screen to
 * itself and there is a way back. It means the browser's back button undoes the
 * choice, which an in-place expansion never could.
 *
 * A server component: every control here is a link or a form posting to a
 * server action, so none of it needs to be shipped as JavaScript.
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

  return (
    <div className="w-full">
      <h1 className="nf-h2 text-center">{isSignUp ? t.auth.createAccount : t.auth.welcomeBack}</h1>
      <p className="mt-1.5 text-center text-[0.875rem] text-[var(--nf-content-muted)]">
        {isSignUp ? t.auth.signUpToStart : t.auth.signInToContinue}
      </p>

      {notice ? (
        <p
          role="status"
          className="nf-card mt-4 px-4 py-3 text-center text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]"
        >
          {notice}
        </p>
      ) : null}

      {/*
        THE "OR CONTINUE WITH" RULE IS GONE WITH THE THINGS IT SEPARATED.

        A divider labelled "or" between one option and nothing is a heading
        over an empty room. Email is the only way in, so it is simply the way
        in, with no ceremony announcing alternatives that do not exist.
      */}

      <div className="space-y-2.5">
        {/* The destination has to travel with the link, or the chain breaks at
            this hop: the person reaches the email form and the form has
            forgotten where they were going. */}
        <Link
          href={`${isSignUp ? "/sign-up/email" : "/sign-in/email"}${
            next ? `?next=${encodeURIComponent(next)}` : ""
          }`}
          className="nf-auth-row"
        >
          <span className="nf-auth-row__mark nf-auth-row__mark--email">
            {/* The last glyph in `ProviderMarks` was an envelope, so that file
                is gone and this is the platform's. Deleting it took the final
                third-party brand colours in the tree with it. */}
            <UiIcon name="mail" size="xs" />
          </span>
          <span className="flex-1 text-left">{t.auth.continueWithEmail}</span>
        </Link>

        {/*
          GOOGLE AND APPLE SIGN IN ARE REMOVED.

          Two rows posted to `startGoogleOAuth` and `startAppleOAuth` behind
          Google's four-colour mark and Apple's, and both were dark by default:
          neither provider is enabled, so the honest state of the screen was two
          disabled buttons and a line of small print explaining that they did
          not work. RentMe does not offer third-party sign in, so the buttons,
          their brand marks, and the apology under them are all gone.

          The server actions themselves are the lead's to retire, along with the
          Supabase provider configuration. Nothing on this screen calls them.
        */}
        {!emailReady && (
          <p className="pt-1 text-center text-[0.75rem] text-[var(--nf-content-muted)]">
            {t.auth.providerUnavailable}
          </p>
        )}
      </div>

      <p className="mt-6 text-center text-[0.875rem] text-[var(--nf-content-secondary)]">
        {isSignUp ? t.auth.haveAccount : t.auth.noAccount}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-[var(--nf-content-link)] underline-offset-4 hover:underline"
        >
          {isSignUp ? t.common.signIn : t.common.signUp}
        </Link>
      </p>

      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        {t.auth.termsNotice}
      </p>
    </div>
  );
}
