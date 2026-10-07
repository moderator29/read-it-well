"use client";

import "./get-started.css";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { animate, useMotionValue, type AnimationPlaybackControls } from "framer-motion";
import type { Dictionary } from "@vallo/i18n/core";
import { rememberFirstRunSeen, withPassedFlag } from "@/components/app/welcome/first-run-seen";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { SPRING_SETTLE, springFor, clamp } from "@/components/ui/ported-motion";
import { cardPose, settleTarget } from "./deck";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { icon3dSrc } from "@/components/ui/icon-3d";
import { TIERED_OBJECTS, tieredSrc } from "@/design-system/icons/object-assets";
import { fill } from "@/lib/passcode/tab";
import { photo, type PhotoName } from "@/lib/site/photos";
import { feedback } from "@/lib/ui/feedback";
import { EXAMPLE_MOVE_IN } from "@/components/site/landing/example-move-in";

export type GetStartedCopy = Dictionary["getStarted"];

/**
 * GET STARTED, AS FOUR CARDS: the founder's reference 3 ("Find your space.",
 * 1 / 4), docs/design/PREMIUM-STANDARD.md, asked for explicitly on 7 October
 * 2026 over the earlier restore. The first screen a stranger meets on a cold
 * start.
 *
 * ONE IDEA PER CARD: find your space; know what you are getting; Vallo never
 * holds your money; homes, stays, restaurants and workspaces in one place.
 * Each card is a two-line headline whose last word is lit in the landing's
 * text ramp (GOVERNING-landing-desktop-hero.png, "reimagined."), one line of
 * body, and a lit night scene of real architecture with one solid 3D
 * object in front of it as the explanation. The Vallo lockup top left, the
 * "1 / 4" counter top right, the dots bottom left and a round glass arrow
 * bottom right. On the last card the arrow opens out into the Get started
 * capsule; "I already have an account" is under the row on every card.
 *
 * THE FRAME IS SHARED, THE CARDS CROSS INSIDE IT. The lockup, counter, dots
 * and arrow never move; only the cards do. So the app opening hands off into
 * card one as structure first (the frame is on screen dim from the first
 * frame, keyed on the startup's `data-splash`, the way the header and dock
 * are in the app), then the scene settles and the headline rises.
 *
 * THE FINGER DRIVES IT. One motion value, `progress` (0 to 3, fractional
 * mid-swipe), follows a horizontal drag directly and is sprung to the nearest
 * card on release with the finger's velocity. Every layer is written from it
 * (`paint`): the type at the full width, the photograph at 0.35 of it and
 * crossfading, the object at 0.7 and turning slightly, so the scene
 * moves slower than the type and the object sits between them in depth. The
 * dots' lit bar and the arrow's opening into Get started follow the same
 * value, so nothing jumps at the end of a swipe. framer-motion is the value
 * and spring engine only (`ported-motion.ts`: the platform loads no feature
 * bundle), and the styles are written straight into the elements.
 *
 * PAGING: the arrow, the dots, a swipe, and the arrow keys. The pager is the
 * dots rather than `SlidePagination`, which is a numbered switcher for
 * desktop tables that hides itself on a phone by design; the dots use its
 * technique (one indicator moved by a motion value, never re-laid out).
 *
 * QUIET (reduced motion, Calm, Off): the drag still follows the finger (it
 * is the person's own movement), every settle is a jump, the entrance and
 * the float are off (get-started.css).
 *
 * KEPT FROM THE INTRO IT REPLACES: NOT SKIPPABLE (the founder, 29 September:
 * no Skip, no close, no tour door); Get started leads to the sign-up options
 * (`/sign-up`) and the one other way on is sign in, each keeping a bare door
 * the person was on their way through. SEEN ONCE: showing this records the
 * device as having met first run (`rememberFirstRunSeen`), and on a browser
 * that refuses the cookie the doors carry the passed flag instead.
 */
/**
 * Each card's scene: a lit photograph and what stands in front of it. Most
 * carry one solid 3D object; the second carries the app's own move-in
 * fragment instead (reference 13, the fragment breaking out of the frame),
 * since a real piece of the product explains "know what you are getting"
 * better than a symbol does.
 *
 * NO GLASS (the founder, 7 October 2026, naming this page: "Remove all glass
 * icons on the entire platform"). The objects are the solid renders, the
 * Belongings rows' look: the map for finding, the card under a lock for
 * money that is never held, the lit hotel and its bell for live, stay, dine.
 */
const SCENES: readonly {
  photo: PhotoName;
  object: string;
  w: number;
  h: number;
  front: "object" | "fragment";
}[] = [
  {
    photo: "villa-pool-skyline-02",
    object: icon3dSrc("map"),
    w: 256,
    h: 256,
    front: "object",
  },
  {
    photo: "villa-exterior-gate",
    object: icon3dSrc("home-verified"),
    w: 256,
    h: 256,
    front: "fragment",
  },
  {
    photo: "tower-entrance-dusk",
    object: icon3dSrc("card-secure"),
    w: 256,
    h: 256,
    front: "object",
  },
  {
    photo: "restaurant-02-lounge",
    object: tieredSrc(TIERED_OBJECTS["scene-hotel-bell"]),
    w: 768,
    h: 768,
    front: "object",
  },
];

export function WelcomeIntro({ copy, next = null }: { copy: GetStartedCopy; next?: string | null }) {
  const router = useRouter();
  const { quiet } = useMotionGate();
  const count = copy.cards.length;

  /* Whether the device kept the seen-once cookie. Written once the page is
     on screen; a refused write means the doors say so in the URL instead. */
  const remembered = useRef(true);
  useEffect(() => {
    remembered.current = rememberFirstRunSeen();
  }, []);

  /* A bare door the person was on their way through keeps its address. */
  const signUp = next && /^\/sign-up(?:[/?#]|$)/.test(next) ? next : "/sign-up";
  const signIn = next && /^\/sign-in(?:[/?#]|$)/.test(next) ? next : "/sign-in";
  const follow = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (remembered.current || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    router.push(withPassedFlag(href));
  };

  const [page, setPage] = useState(0);
  /* A card's art loads once it is the current card or the one either side,
     and then stays: four photographs on a cold open would be the first screen
     paying for three it may never show. */
  const [near, setNear] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  const turn = useCallback((to: number) => {
    setPage(to);
    setNear((had) => (had.has(to - 1) && had.has(to + 1) ? had : new Set([...had, to - 1, to, to + 1])));
  }, []);
  const progress = useMotionValue(0);
  const flight = useRef<AnimationPlaybackControls | null>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const dotsRef = useRef<HTMLSpanElement | null>(null);
  const goRef = useRef<HTMLDivElement | null>(null);

  /* Every layer, written from the one value. */
  const paint = useCallback(
    (p: number) => {
      slides.current.forEach((slide, i) => {
        if (!slide) return;
        for (const [key, value] of Object.entries(cardPose(i, p))) slide.style.setProperty(key, value);
      });
      /* The dots' lit bar travels with the deck. */
      dotsRef.current?.style.setProperty("--gs-at", clamp(p, 0, count - 1).toFixed(4));
      /* The arrow opens into Get started across the last crossing. */
      goRef.current?.style.setProperty("--gs-open", clamp(p - (count - 2), 0, 1).toFixed(4));
    },
    [count]
  );

  useLayoutEffect(() => {
    paint(progress.get());
    return progress.on("change", paint);
  }, [paint, progress]);

  const settle = useCallback(
    (target: number, velocity = 0) => {
      flight.current?.stop();
      flight.current = animate(progress, target, {
        ...springFor(quiet, SPRING_SETTLE),
        velocity: quiet ? 0 : velocity,
      });
    },
    [progress, quiet]
  );

  const go = useCallback(
    (to: number) => {
      const target = clamp(to, 0, count - 1);
      if (target !== page) feedback("select");
      turn(target);
      settle(target);
    },
    [count, page, settle, turn]
  );

  /* THE DRAG. Horizontal only: a mostly vertical move is left to the page. */
  const drag = useRef<{
    id: number;
    x0: number;
    y0: number;
    p0: number;
    live: boolean;
    w: number;
    samples: { x: number; t: number }[];
  } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("a, button")) return;
    flight.current?.stop();
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      p0: progress.get(),
      live: false,
      w: Math.max(e.currentTarget.clientWidth, 1),
      samples: [],
    };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.live) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy)) {
        if (Math.abs(dy) > 10) drag.current = null;
        return;
      }
      d.live = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.dragging = "true";
    }
    let p = d.p0 - dx / d.w;
    /* Past either end the deck gives a little and pulls back. */
    if (p < 0) p = p * 0.3;
    if (p > count - 1) p = count - 1 + (p - (count - 1)) * 0.3;
    progress.set(p);
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
  };
  const release = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !d.live) return;
    delete e.currentTarget.dataset.dragging;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = first && last ? Math.max(last.t - first.t, 1) : 1;
    const vx = first && last && !cancelled ? ((last.x - first.x) / dt) * 1000 : 0;
    const target = settleTarget(d.p0, progress.get(), vx, count);
    if (target !== page) feedback("select");
    turn(target);
    /* The spring inherits the finger's speed, in cards per second. */
    settle(target, -vx / d.w);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(page + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(page - 1);
    }
  };

  const last = page === count - 1;

  return (
    <main id="main" className="nf-gs2" data-testid="welcome-intro">
      <section className="nf-gs2-card" aria-roledescription="carousel" aria-label={copy.label} onKeyDown={onKeyDown}>
        <header className="nf-gs2-top nf-gs2-frame">
          <span className="nf-gs2-lockup" role="img" aria-label="Vallo">
            <Image
              src="/brand/vallo-mark.png"
              alt=""
              width={614}
              height={587}
              sizes="28px"
              priority
              className="nf-gs2-lockup__mark"
            />
            <Image
              src="/brand/vallo-wordmark.png"
              alt=""
              width={758}
              height={167}
              sizes="84px"
              priority
              className="nf-gs2-lockup__word"
            />
          </span>
          <span className="nf-gs2-count" aria-hidden="true">
            {fill(copy.counter, { n: page + 1, total: count })}
          </span>
        </header>

        <div
          className="nf-gs2-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => release(e, false)}
          onPointerCancel={(e) => release(e, true)}
        >
          {copy.cards.map((card, i) => {
            const scene = SCENES[i % SCENES.length]!;
            const lead = card.lines.slice(0, -1);
            const tail = card.lines[card.lines.length - 1] ?? "";
            /* The lit part: the last word, or the whole last line (the
               three-line store headline, "Find. Check. Move in."). */
            const cut = card.litLine ? -1 : tail.lastIndexOf(" ");
            const head = cut >= 0 ? tail.slice(0, cut + 1) : "";
            const lit = cut >= 0 ? tail.slice(cut + 1) : tail;
            const here = i === page;
            return (
              <article
                key={i}
                ref={(el) => {
                  slides.current[i] = el;
                }}
                className="nf-gs2-slide"
                data-lines={card.lines.length}
                style={cardPose(i, 0) as CSSProperties}
                data-first={i === 0 || undefined}
                aria-roledescription="slide"
                aria-label={fill(copy.cardOf, { n: i + 1, total: count })}
                aria-hidden={!here}
                inert={!here}
                data-testid={`gs-card-${i + 1}`}
              >
                <div className="nf-gs2-scene" role="img" aria-label={card.scene}>
                  {near.has(i) ? (
                    <>
                      <div className="nf-gs2-scene__in">
                        <Image
                          src={photo(scene.photo)}
                          alt=""
                          fill
                          sizes="(min-width: 64rem) 640px, 100vw"
                          priority={i === 0}
                          loading={i === 0 ? undefined : "eager"}
                          draggable={false}
                          className="nf-gs2-photo"
                        />
                      </div>
                      {scene.front === "fragment" ? (
                        <MoveInFragment copy={copy.fragment} />
                      ) : (
                        <div className="nf-gs2-object">
                          <div className="nf-gs2-object__in">
                            <div className="nf-gs2-object__float">
                              <Image
                                src={scene.object}
                                alt=""
                                width={scene.w}
                                height={scene.h}
                                sizes="(min-width: 64rem) 280px, 190px"
                                priority={i === 0}
                                loading={i === 0 ? undefined : "eager"}
                                draggable={false}
                                className="nf-gs2-object__img"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
                {/* The trust line (reference 13's laurels, made true). Outside the
                    scene's image role, so it is read. */}
                {i === 0 ? (
                  <p className="nf-gs2-trust">
                    <UiIcon name="shield-check" size={16} />
                    {copy.trust}
                  </p>
                ) : null}
                <div className="nf-gs2-copy">
                  <h2 className="nf-gs2-title">
                    {lead.map((line, n) => (
                      <span key={n} className="nf-gs2-line" style={{ "--gs-i": n } as CSSProperties}>
                        <span className="nf-gs2-line__in">{line}</span>
                      </span>
                    ))}
                    <span className="nf-gs2-line" style={{ "--gs-i": lead.length } as CSSProperties}>
                      <span className="nf-gs2-line__in">
                        {head}
                        <span className="nf-gs2-lit">{lit}</span>
                      </span>
                    </span>
                  </h2>
                  <p className="nf-gs2-body" style={{ "--gs-i": lead.length + 1 } as CSSProperties}>
                    {card.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        {/* What a screen reader hears when the card changes: where it is and the headline. */}
        <p className="sr-only" aria-live="polite">
          {`${fill(copy.cardOf, { n: page + 1, total: count })}. ${copy.cards[page]?.lines.join(" ") ?? ""}`}
        </p>

        <footer className="nf-gs2-foot nf-gs2-frame">
          <div className="nf-gs2-row">
            {/* Back, on a desktop, where there is no thumb to swipe with. */}
            <button
              type="button"
              className="nf-gs2-prev"
              aria-label={copy.previous}
              disabled={page === 0}
              onClick={() => go(page - 1)}
              data-testid="gs-previous"
            >
              <UiIcon name="arrow-left" size={20} />
            </button>
            <span className="nf-gs2-dots" aria-hidden="true">
              <span ref={dotsRef} className="nf-gs2-dots__track">
                <span className="nf-gs2-dots__lit" />
                {copy.cards.map((_, i) => (
                  <span key={i} className="nf-gs2-dot" />
                ))}
              </span>
            </span>
          </div>
          {/* THE ONE ACTION (the Plasma set, D74): a full-width white capsule
              with a soft glow and its reflection on the floor. "Next" on the
              first three cards; across the last crossing it becomes "Get
              started", the same capsule, the words crossfading with the deck. */}
          <div ref={goRef} className="nf-gs2-go" data-last={last || undefined}>
            <button
              type="button"
              className="nf-gs2-cap nf-gs2-next"
              aria-hidden={last}
              inert={last}
              onClick={() => go(page + 1)}
              data-testid="gs-next"
            >
              {copy.next}
              <UiIcon name="arrow-right" size={20} />
            </button>
            <Link
              href={signUp}
              prefetch={false}
              onClick={follow(signUp)}
              className="nf-gs2-cap nf-gs2-cta"
              aria-hidden={!last}
              inert={!last}
              data-testid="intro-get-started"
            >
              {copy.getStarted}
              <UiIcon name="arrow-right" size={20} />
            </Link>
            <span className="nf-gs2-floor" aria-hidden="true" />
          </div>
          <Link
            href={signIn}
            prefetch={false}
            onClick={follow(signIn)}
            className="nf-gs2-have"
            data-testid="intro-sign-in"
          >
            {copy.haveAccount}
          </Link>
        </footer>
      </section>
    </main>
  );
}

/**
 * The second card's app fragment (reference 13, the product's own UI breaking
 * out of the frame): the move-in total the product shows before a visit, as
 * a frosted raised card in front of the scene. Its figures are the landing's
 * own example flat (`example-move-in.ts`, the same numbers the move-in band
 * draws), and it says Example; it claims nothing about a real listing.
 */
function MoveInFragment({ copy }: { copy: GetStartedCopy["fragment"] }) {
  const naira = (minor: number) => `₦${new Intl.NumberFormat("en-NG").format(Math.round(minor / 100))}`;
  const fees =
    EXAMPLE_MOVE_IN.fees.agency +
    EXAMPLE_MOVE_IN.fees.legal +
    EXAMPLE_MOVE_IN.fees.caution +
    EXAMPLE_MOVE_IN.fees.agreement;
  return (
    <div className="nf-gs2-object nf-gs2-frag" aria-label={copy.label} role="img">
      <div className="nf-gs2-object__in">
        <div className="nf-gs2-object__float">
          <div className="nf-gs2-frag__card" aria-hidden="true">
            <span className="nf-gs2-frag__head">
              <span className="nf-gs2-frag__title">{copy.title}</span>
              <span className="nf-gs2-frag__tag">{copy.example}</span>
            </span>
            <span className="nf-gs2-frag__total nf-numeric">{naira(EXAMPLE_MOVE_IN.total)}</span>
            <span className="nf-gs2-frag__row">
              <span>{copy.rent}</span>
              <span className="nf-numeric">{naira(EXAMPLE_MOVE_IN.rent)}</span>
            </span>
            <span className="nf-gs2-frag__row">
              <span>{copy.fees}</span>
              <span className="nf-numeric">{naira(fees)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
