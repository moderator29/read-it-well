import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/design-system/brand/Logo";
import { StoreBadges } from "./StoreBadges";
import { storeBadges } from "./store-badges";

/**
 * THE CLOSE: THE APP AND THE SIGN-UP CAPSULE (P7, 7 October 2026).
 *
 * The founder's store screenshots (`store-screens-learn-create-get-paid.jpg`):
 * a huge three-line headline with full stops, every line a step that is true
 * today ("Find. Agree. Move in."). Then the Plasma payoff: one white capsule
 * with its reflection on the floor, "Create your account", and a quiet "Sign
 * in" beside it. Under a hairline, the app: the store badges, honest about a
 * store that is not live yet (`store-badges.ts`), and none at all inside a
 * native shell (STORE-06, App Store 2.3.10).
 *
 * This replaces the old big card with three floating objects and the
 * separate "Take Vallo with you" band: one room, one action.
 *
 * BOTH DOORS ARE WHAT THEY SAY. "Create your account" goes to `/start`,
 * which hands a stranger to first run and on to sign up; "Sign in" goes to
 * sign in. Neither promises the catalogue (UIUX item 12).
 */
export function FinalCta({ t, native = false }: { t: Dictionary; native?: boolean }) {
  const c = t.landingRooms.close;
  const p = t.experienceLanding.plasma.close;
  /* `NEXT_PUBLIC_*` is inlined at build time. */
  const badges = storeBadges({
    appStoreUrl: process.env.NEXT_PUBLIC_APP_STORE_URL,
    playStoreUrl: process.env.NEXT_PUBLIC_PLAY_STORE_URL,
    native,
  });
  return (
    <section className="nf-pl-close" data-chapter="close" data-theme="dark" aria-labelledby="nf-landing-close-title">
      <div className="nf-shell">
        <MotionReveal className="nf-pl-close__stage">
          <span className="nf-pl-close__mark" aria-hidden="true">
            <LogoMark size={40} />
          </span>
          <h2 id="nf-landing-close-title" className="nf-pl-close__title">
            {p.lines.map((line, i) => (
              <span key={line} data-last={i === p.lines.length - 1 ? "true" : undefined}>
                {line}
              </span>
            ))}
          </h2>
          <p className="nf-pl-close__body">{c.body}</p>
          <div className="nf-pl-close__actions">
            <ButtonLink href="/start" variant="primary" size="lg" trailingIcon="arrow-right" className="nf-pl-capsule">
              {c.join}
            </ButtonLink>
            <Link href="/sign-in" className="nf-pl-close__signin">
              {c.signIn}
            </Link>
          </div>
          {badges.length > 0 ? (
            <div className="nf-pl-close__app">
              <p className="nf-pl-overline">{p.app}</p>
              <StoreBadges badges={badges} labels={t.landingRooms.badges} className="nf-pl-close__badges" />
            </div>
          ) : null}
        </MotionReveal>
      </div>
    </section>
  );
}
