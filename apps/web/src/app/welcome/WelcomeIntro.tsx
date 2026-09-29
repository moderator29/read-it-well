"use client";

import "./intro.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n/core";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { AuthPillLink } from "@/components/auth/slate";
import { rememberFirstRunSeen, withPassedFlag } from "@/components/app/welcome/first-run-seen";

/**
 * The welcome intro: the first screen a stranger meets, to
 * `docs/design/references/2026-09-29/11-welcome-intro-grok.jpg` ("After").
 *
 * A soft blue full page, the mark and the name centred at the top with one
 * line under them, a small moving scene in the middle made of Vallo's own
 * glass objects (the house, its keys, the receipt, and a chip that says what
 * the product prints for you), then the two doors: Get started (to sign up)
 * and Sign in. The four first-run slides stay one tap away as the tour.
 *
 * THEMES, by the Slate rule: in light the page is brand blue lifting to
 * white and the pill is the brand's navy; in dark the page is the night navy
 * with the blue haze and the pill turns white with navy words.
 *
 * SEEN ONCE. Showing this screen records the device as having met first
 * run, exactly as reaching the slides' end does, so `/sign-in`'s first-run
 * gate does not send the person straight back here. When the browser refuses
 * the cookie the doors carry the passed flag instead (`withPassedFlag`), so
 * a cookie-refusing browser cannot loop.
 *
 * MOTION is ambient and small (the objects bob, the dashed path runs, the
 * chip pops in once), transform and opacity only, and all of it stops under
 * reduced motion (`intro.css`).
 */
export function WelcomeIntro({ t, next = null }: { t: Dictionary; next?: string | null }) {
  const c = t.welcomeCards.intro;
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
  const tour = next ? `/welcome?tour=1&next=${encodeURIComponent(next)}` : "/welcome?tour=1";

  return (
    <main id="main" className="nf-intro nf-slate">
      <div className="nf-intro__ground" aria-hidden="true" />

      <div className="nf-intro__col">
        <header className="nf-intro__head">
          <p className="nf-intro__brand">
            <Image
              src="/brand/vallo-mark.png"
              alt=""
              aria-hidden
              width={614}
              height={587}
              sizes="44px"
              priority
              className="nf-intro__mark"
            />
            <span className="nf-intro__name">VALLO</span>
          </p>
          <h1 className="nf-intro__tagline">{c.tagline}</h1>
        </header>

        <div className="nf-intro__scene" role="img" aria-label={c.sceneLabel}>
          <svg className="nf-intro__path" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
            <path d="M92 118C110 40 214 26 250 92" />
          </svg>
          <svg className="nf-intro__wave" viewBox="0 0 90 40" aria-hidden="true" focusable="false">
            <path d="M2 20c6 0 6-14 12-14s6 28 12 28 6-24 12-24 6 20 12 20 6-14 12-14 6 10 12 10 6-6 12-6" />
          </svg>
          {/* The glass objects sit on their own night ground in both themes
              (the light theme's rule for them), so `data-theme="dark"` keeps
              the daylight tile off: the bubble is the tile. */}
          <div className="nf-intro__obj nf-intro__obj--house" data-theme="dark">
            <BrandIcon name="modern-house" size={148} priority />
          </div>
          <div className="nf-intro__obj nf-intro__obj--keys" data-theme="dark">
            <BrandIcon name="keys-home" size={118} priority />
          </div>
          <div className="nf-intro__receipt" data-theme="dark">
            <BrandIcon name="receipt-check" size={46} />
          </div>
          <p className="nf-intro__chip" aria-hidden="true">
            <span className="nf-intro__ticks">
              <span />
              <span />
              <span />
            </span>
            {c.chip}
          </p>
        </div>

        <div className="nf-intro__actions">
          <AuthPillLink href={signUp} prefetch={false} onClick={follow(signUp)}>
            {c.getStarted}
          </AuthPillLink>
          <AuthPillLink href={signIn} quiet prefetch={false} onClick={follow(signIn)}>
            {c.signIn}
          </AuthPillLink>
          <Link href={tour} prefetch={false} className="nf-tap nf-intro__tour">
            {c.tour}
          </Link>
        </div>
      </div>
    </main>
  );
}
