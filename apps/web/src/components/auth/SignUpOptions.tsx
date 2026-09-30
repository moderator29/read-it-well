import type { Dictionary } from "@vallo/i18n/core";
import type { SignInSurface } from "@/lib/auth/providers";
import { withNext } from "@/lib/auth/next-link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SocialDoors } from "./SocialDoors";
import { AuthOrRule, AuthPillLink } from "./slate";

/**
 * The sign-up options page (`/sign-up`), where Get started on the welcome
 * intro leads (the founder, 29 September): one clean column of ways in, in
 * the Slate style.
 *
 *   Sign up with email          the brand pill, to the two-step form
 *                               (`/sign-up/email`)
 *   Continue with Google        drawn only when it works here (`SocialDoors`)
 *   Continue with Apple         the same rule; the native sheet in the iOS shell
 *   Continue with phone number  A2, only while `PHONE_SIGNIN_ENABLED` is on:
 *                               `/sign-in/phone`, where a new number makes
 *                               an account and the finish-setup gate asks for
 *                               the terms and the 18+ statement
 *   I already have an account   the quiet pill, to sign in
 *
 * `next` rides every door, so a stranger stopped on the way to a shared
 * listing still lands on it afterwards. It is re-validated by every action
 * and every page it reaches, never trusted here.
 *
 * A server component: every door is a link or a form posting a server
 * action, so it works before the page hydrates.
 */
export function SignUpOptions({
  t,
  googleReady,
  appleReady,
  surface = "web",
  next,
  phoneReady = false,
}: {
  t: Dictionary;
  googleReady: boolean;
  appleReady: boolean;
  surface?: SignInSurface;
  next?: string | undefined;
  /** A2: phone sign-in is switched on (`phoneSignInEnabled()`). */
  phoneReady?: boolean;
}) {
  return (
    <div className="nf-auth__screen nf-slate-stagger">
      <h1 className="nf-auth__title">{t.auth.optionsTitle}</h1>
      <p className="nf-auth__sub">{t.auth.optionsLead}</p>

      <div className="nf-slate-options nf-slate-stagger">
        <AuthPillLink href={withNext("/sign-up/email", next)} className="nf-auth__cta" testId="options-email">
          {t.auth.signUpWithEmail}
        </AuthPillLink>
        <SocialDoors
          t={t}
          googleReady={googleReady}
          appleReady={appleReady}
          surface={surface}
          next={next}
          intent="sign-up"
          layout="rows"
        />
        {phoneReady && (
          <AuthPillLink href={withNext("/sign-in/phone", next)} quiet testId="options-phone">
            <UiIcon name="phone" size={20} />
            {t.publicDoors.phone.offer}
          </AuthPillLink>
        )}
      </div>

      <AuthOrRule>{t.auth.orDivider}</AuthOrRule>

      <div className="nf-slate-options">
        <AuthPillLink href={withNext("/sign-in", next)} quiet testId="options-have-account">
          {t.auth.haveAccountCta}
        </AuthPillLink>
      </div>
    </div>
  );
}
