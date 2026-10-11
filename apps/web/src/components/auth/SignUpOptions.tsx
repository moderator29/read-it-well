import { MARK_VIEWBOX } from "@/lib/brand/logo-geometry";
import "@/app/css/auth.css";
import "@/app/css/auth-doors.css";
import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import type { SignInSurface } from "@/lib/auth/providers";
import { withNext } from "@/lib/auth/next-link";
import { photo } from "@/lib/site/photos";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SocialDoors } from "./SocialDoors";
import { AuthPillLink } from "./slate";
import { AuthBackBar } from "@/app/(auth)/AuthBackBar";

/**
 * The sign-up options page (`/sign-up`), where Get started leads (the
 * founder, 29 September). Drawn on a photograph since 7 October (his evening
 * reference `onboarding-splash-photo-signin-journey.jpg`, at the Plasma
 * level, D74; `app/css/auth-doors.css`): a full-bleed lit Vallo scene, one
 * large light statement, the ways in stacked as capsules at the thumb, the
 * legal in the layout's tiny type.
 *
 *   Continue with Google        drawn only when it works here (`SocialDoors`),
 *                               a white capsule
 *   Continue with Apple         the same rule; the native sheet in the iOS shell
 *   Sign up with email          to the two-step form (`/sign-up/email`): the
 *                               dark glass capsule under a provider, the white
 *                               one when it is the only way
 *   Continue with phone number  A2, only while `PHONE_SIGNIN_ENABLED` is on:
 *                               `/sign-in/phone`, where a new number makes
 *                               an account and the finish-setup gate asks for
 *                               the terms and the 18+ statement
 *   I already have an account   a quiet line, to sign in
 *
 * NOTHING ABOUT THE DOORS CHANGED, only how they are drawn: the same links,
 * the same forms, the same test ids, the same conditions for each provider
 * (no provider is drawn that is not wired). `next` rides every door, so a
 * stranger stopped on the way to a shared listing still lands on it
 * afterwards. It is re-validated by every action and every page it reaches,
 * never trusted here.
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
  /* The same rule `SocialDoors` draws by: is any provider capsule on screen? */
  const provider = (googleReady && surface === "web") || (appleReady && (surface === "web" || surface === "ios-native"));
  return (
    <div className="nf-auth__screen nf-doors" data-testid="sign-up-doors">
      <div className="nf-doors__photo" aria-hidden="true">
        <Image
          src={photo("villa-pool-portrait")}
          alt=""
          fill
          sizes="100vw"
          priority
          draggable={false}
          className="nf-doors__img"
        />
      </div>

      <div className="nf-doors__back">
        <AuthBackBar />
      </div>

      <div className="nf-doors__words">
        <Image
          src="/brand/vallo-mark.svg"
          /* Decorative: the statement beside it is the content, and a
             hard-coded "Vallo" alt is copy the dictionary does not own. */
          alt=""
          aria-hidden
          width={MARK_VIEWBOX.w}
          height={MARK_VIEWBOX.h}
          priority
          className="nf-doors__mark"
        />
        <h1 className="nf-doors__title">{t.auth.optionsTitle}</h1>
        <p className="nf-doors__lead">{t.auth.optionsLead}</p>
      </div>

      <div className="nf-doors__stack">
        <SocialDoors
          t={t}
          googleReady={googleReady}
          appleReady={appleReady}
          surface={surface}
          next={next}
          intent="sign-up"
          layout="rows"
        />
        <AuthPillLink
          href={withNext("/sign-up/email", next)}
          className={provider ? "nf-auth__cta nf-doors__glass" : "nf-auth__cta"}
          testId="options-email"
        >
          <UiIcon name="mail" size={20} />
          {t.auth.signUpWithEmail}
        </AuthPillLink>
        {phoneReady && (
          <AuthPillLink href={withNext("/sign-in/phone", next)} quiet className="nf-doors__glass" testId="options-phone">
            <UiIcon name="phone" size={20} />
            {t.publicDoors.phone.offer}
          </AuthPillLink>
        )}
        <Link href={withNext("/sign-in", next)} className="nf-doors__have" data-testid="options-have-account">
          {t.auth.haveAccountCta}
        </Link>
      </div>
    </div>
  );
}
