"use client";

import "./get-started.css";
import { useEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { VectorMark } from "@/components/auth/VectorMark";
import { rememberFirstRunSeen, withPassedFlag } from "@/components/app/welcome/first-run-seen";
import { introDoors } from "./doors";
import { useStageMotion } from "./stage-motion";

/**
 * GET STARTED, MONOTONE (directive D13, north star 14.5, MOTION_SYSTEM.md
 * section 4). The first screen a stranger meets on a cold start, and once the
 * startup sequence lands, the first screen after it: the most seen screen in
 * the product.
 *
 * WHAT IT IS FOR, decided before it was drawn (craft doctrine 7): to say what
 * Vallo is in one line and offer the two ways in. So the screen holds exactly
 * that, in this order, with air between: the mark, small, where the startup's
 * lockup will settle (`lockup.ts`); the slogan as the one display line; the
 * product explanation as the one quiet line (both `landing`, D1); then the
 * doors, the primary solid and the secondary outlined, both the platform's
 * radius 14 rectangles, which are the only contrast on the screen; and the
 * small print that the sign-up form's tick will ask them to agree to.
 *
 * ONE HUE. The ground is the night navy with one soft wash of the brand blue
 * behind the mark and a heavily damped aurora; the mark and the words are
 * the blue family and the night's own ink. No art, no carousel, no phone, no
 * list, no proof (there is none yet that is true), and nothing that would
 * make a phone scroll. The founder's scene and its objects live on in the
 * tour behind this screen, whose steps are unchanged (D28).
 *
 * FOUR LAYERS OF DEPTH, moved by `useStageMotion` (`stage-motion.ts`): the
 * wash at 0.3, the aurora at 0.45, the mark at 0.6 and the words and doors at
 * 1.0, by the device's tilt (or a desktop pointer) up to 6px, and a pull down
 * past the top stretches the wash and the mark by 0.6 of the drag. Off under
 * reduced motion, Calm, Off and data saver.
 *
 * THE ENTRANCE is 900ms of CSS (`get-started.css`), and the mark has none:
 * it is already where the startup leaves it, which is the continuity the
 * spec calls the premium detail.
 *
 * SEEN ONCE. Showing this screen records the device as having met first run,
 * so `/sign-in`'s first-run gate does not send the person back here; when the
 * browser refuses the cookie the doors carry the passed flag instead.
 */
export function WelcomeIntro({ t, next = null }: { t: Dictionary; next?: string | null }) {
  const c = t.welcomeCards.intro;
  const router = useRouter();
  const stage = useRef<HTMLDivElement>(null);
  const remembered = useRef(true);
  useEffect(() => {
    remembered.current = rememberFirstRunSeen();
  }, []);
  useStageMotion(stage);

  const { signUp, signIn } = introDoors(next);
  const follow = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (remembered.current || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.push(withPassedFlag(href));
  };

  return (
    <main id="main" className="nf-gs nf-gsm-page" data-testid="welcome-intro">
      <div ref={stage} className="nf-gsm">
        <div className="nf-gsm__layer nf-gsm__wash" aria-hidden="true" />
        <div className="nf-gsm__layer nf-gsm__aurora" aria-hidden="true">
          <span className="nf-gsm__drift nf-gsm__drift--a" />
          <span className="nf-gsm__drift nf-gsm__drift--b" />
        </div>
        <div className="nf-gsm__mark">
          <VectorMark size={44} label="Vallo" className="nf-gsm__vmark" />
        </div>

        <div className="nf-gsm__front">
          <div className="nf-gsm__copy">
            <h1 className="nf-gsm__line">{t.landing.slogan}</h1>
            <p className="nf-gsm__quiet">{t.landing.explanation}</p>
          </div>

          <div className="nf-gsm__doors">
            <ButtonLink
              href={signUp}
              variant="primary"
              size="lg"
              full
              prefetch={false}
              onClick={follow(signUp)}
              className="nf-gsm__door nf-gsm__door--primary"
              data-testid="intro-get-started"
            >
              {c.getStarted}
            </ButtonLink>
            <ButtonLink
              href={signIn}
              variant="secondary"
              size="lg"
              full
              prefetch={false}
              onClick={follow(signIn)}
              className="nf-gsm__door nf-gsm__door--secondary"
              data-testid="intro-sign-in"
            >
              {c.signIn}
            </ButtonLink>
            <p className="nf-gsm__legal">
              {t.auth.termsNotice} <Link href="/terms">{t.safety.termsLink}</Link>
              {" · "}
              <Link href="/privacy">{t.safety.privacyLink}</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
