import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { startAppleOAuth, startGoogleOAuth } from "@/lib/auth/actions";
import type { ProviderId, ProviderState } from "@/lib/auth/providers";
import { AppleMark, GoogleMark, MailMark } from "./ProviderMarks";

/**
 * How you want to get in. Three rows, and nothing else on the screen.
 *
 * This used to be the same component as the form. Choosing email expanded it
 * in place, which on sign-up meant nine fields in four groups unrolled between
 * the heading and the Google and Apple rows - so the two provider buttons
 * ended up stranded four screens down, under a form somebody was already
 * filling in, reading as leftovers rather than as alternatives. That is the
 * fault the owner photographed.
 *
 * So the choice and the form are now two routes. This page offers the three
 * ways in; email opens `/sign-up/email` (or `/sign-in/email`) where the form
 * has the screen to itself and there is a way back. It is what every consumer
 * app of this shape does, and it means the browser's back button undoes the
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

  const oauth: { id: ProviderId; label: string; mark: React.ReactNode }[] = [
    { id: "google", label: t.auth.continueWithGoogle, mark: <GoogleMark /> },
    { id: "apple", label: t.auth.continueWithApple, mark: <AppleMark /> },
  ];

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

      <div className="mt-6 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
        <span className="text-[0.75rem] uppercase tracking-[0.14em] text-[var(--nf-content-muted)]">
          {t.auth.orContinue}
        </span>
        <span className="h-px flex-1 bg-[var(--nf-border-subtle)]" />
      </div>

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
            <MailMark size={16} />
          </span>
          <span className="flex-1 text-left">{t.auth.continueWithEmail}</span>
        </Link>

        {/* Each provider is its own form posting to the OAuth start action.
            A form rather than an onClick so the handshake begins on the server,
            where the redirect belongs: a client-side redirect would have to
            know the callback URL, and only the server does. Until a provider is
            switched on in the Supabase dashboard and named in
            NEXT_PUBLIC_AUTH_PROVIDERS, the control stays disabled and says so
            below, rather than sending someone to an error page. */}
        {oauth.map((p) => (
          <form key={p.id} action={p.id === "google" ? startGoogleOAuth : startAppleOAuth}>
            {next ? <input type="hidden" name="next" value={next} /> : null}
            {/* Which door this is. The provider round trip loses everything
                except the callback URL, and both doors post to the same
                action, so the callback cannot tell a returning person from a
                new one unless this travels with them. Without it, somebody
                signing back in was told we were "verifying your email". */}
            <input type="hidden" name="intent" value={isSignUp ? "sign-up" : "sign-in"} />
            <button type="submit" disabled={!configured(p.id)} className="nf-auth-row w-full">
              <span className="nf-auth-row__mark">{p.mark}</span>
              <span className="flex-1 text-left">{p.label}</span>
            </button>
          </form>
        ))}

        {oauth.some((p) => !configured(p.id)) && (
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
