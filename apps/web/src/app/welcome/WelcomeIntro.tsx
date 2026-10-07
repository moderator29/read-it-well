"use client";

import "./welcome.css";
import { useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { AuthPillLink } from "@/components/auth/slate";
import { rememberFirstRunSeen, withPassedFlag } from "@/components/app/welcome/first-run-seen";
import { Lockup, RiseWords, StepArt, wordsIn, type Art } from "@/components/app/welcome/StepArt";
import { stepPhoto } from "@/components/app/welcome/step-photos";

/**
 * The welcome intro: the first screen a stranger meets on a cold start, as
 * ONE FULL-PAGE STEP in the language of the tour behind it (references 42
 * and 43, 30 September): the art full bleed over the top of the screen,
 * Vallo's house standing on the hills with its keys and the receipt, fading
 * into the page; then the two-line headline, the one line of what Vallo is,
 * and the two doors. NOT SKIPPABLE (the founder, 29 September): there is no
 * Skip, no close and no tour door; Get started leads to the sign-up options
 * page (`/sign-up`), and Sign in is the one other way on.
 *
 * THEMES. The art is its own brand-blue sky in both; the page under it is
 * the night navy (dark, the default) or the warm paper (light), and the
 * pills follow the Slate rule (white in dark, the brand in light).
 *
 * SEEN ONCE. Showing this screen records the device as having met first
 * run, exactly as reaching the tour's end does, so `/sign-in`'s first-run
 * gate does not send the person straight back here. When the browser refuses
 * the cookie the doors carry the passed flag instead (`withPassedFlag`), so
 * a cookie-refusing browser cannot loop.
 *
 * MOTION: the objects float, the headline rises in word by word and the
 * doors follow; transform and opacity only, and Calm, Off and reduced
 * motion are answered in welcome.css.
 */
export function WelcomeIntro({ t, next = null }: { t: Dictionary; next?: string | null }) {
  const c = t.welcomeCards.intro;
  const w = t.welcomeCards.twoWorlds;
  const router = useRouter();
  /* Whether the device kept the seen-once cookie. Written once the page is
     on screen; a refused write means the doors say so in the URL instead. */
  const remembered = useRef(true);
  useEffect(() => {
    remembered.current = rememberFirstRunSeen();
  }, []);

  /* A bare door the person was on their way through keeps its address. */
  const signUp = next && /^\/sign-up(?:[/?#]|$)/.test(next) ? next : "/sign-up";
  const signIn = next && /^\/sign-in(?:[/?#]|$)/.test(next) ? next : "/sign-in";
  /* A door's own address, and on a cookie-refusing browser the same address
     with the passed flag, so the sign-in gate cannot send it back here. */
  const follow = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (remembered.current || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.push(withPassedFlag(href));
  };

  const art: Art = {
    hero: { kind: "image", src: "/brand/glass/hero/hero-property.png" },
    satellites: [
      { src: "/brand/glass/keys-home.png", at: "bl" },
      { src: "/brand/glass/receipt-check.png", at: "tr" },
    ],
    tags: [c.chip],
    sky: "dawn",
    label: c.sceneLabel,
    photo: stepPhoto(1),
  };
  const lead = wordsIn(w.titleA) + wordsIn(w.titleB);

  return (
    <main id="main" className="nf-gs" data-testid="welcome-intro">
      <div className="nf-gs-steps nf-slate nf-gs-intro">
        <div className="nf-gs-carousel">
          <div className="nf-gs-art" role="img" aria-label={c.sceneLabel}>
            <div className="nf-gs-layer" data-sky={art.sky} aria-hidden="true">
              <StepArt art={art} priority />
            </div>
            <Lockup themed={!!art.photo} />
          </div>

          <div className="nf-gs-copy">
            <h1 className="nf-gs-title">
              <span className="nf-gs-title__a">
                <RiseWords text={w.titleA} />
              </span>
              <span className="nf-gs-title__b">
                <RiseWords text={w.titleB} start={wordsIn(w.titleA)} />
              </span>
            </h1>
            <p className="nf-gs-sub nf-gs-rise" style={{ "--nf-i": lead } as CSSProperties}>
              {c.tagline}
            </p>
          </div>

          <div
            className="nf-gs-foot nf-gs-foot--last nf-gs-rise"
            style={{ "--nf-i": lead + 2 } as CSSProperties}
          >
            <AuthPillLink href={signUp} prefetch={false} onClick={follow(signUp)} testId="intro-get-started">
              {c.getStarted}
            </AuthPillLink>
            <AuthPillLink href={signIn} quiet prefetch={false} onClick={follow(signIn)} testId="intro-sign-in">
              {c.signIn}
            </AuthPillLink>
          </div>
        </div>
      </div>
    </main>
  );
}
