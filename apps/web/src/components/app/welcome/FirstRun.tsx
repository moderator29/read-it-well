"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ComponentProps, CSSProperties } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BackControl } from "@/components/ui/BackControl";
import { isInPageStep } from "@/lib/nav/in-page-step";
import { Button, ButtonLink } from "@/components/ui/Button";
import { markWelcomeSeen, skipInterests } from "@/lib/interests/actions";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { flickDirection, releaseVelocity, rubber, springTo, type SpringConfig } from "@/components/site/landing/spring";
import { InterestChoices } from "./InterestChoices";
import { ArrivalAsks } from "./ArrivalAsks";
import { Lockup, RiseWords, StepArt, wordsIn, type Art } from "./StepArt";
import {
  forgetFirstInterest,
  rememberFirstInterest,
  rememberFirstRunSeen,
  withPassedFlag,
  isSignUpForm,
} from "./first-run-seen";
import type { Arrival } from "@/app/welcome/plan";
import { wallHeading } from "./wall-heading";
import { destinationOf, withNext } from "@/lib/auth/next-link";

/**
 * Get started: FULL-PAGE STEPS, to `docs/design/references/2026-09-29/42`
 * (full-bleed art per step) and `43` (one full-width call on the last step).
 *
 * THE SHAPE OF A STEP. The top 55 to 60 percent of the screen is the step's
 * art, full bleed: a brand-blue sky with soft hills, Vallo's own glass
 * objects standing in it, and the whole picture fading into the page below
 * the middle. Under it a big, tight two-line headline, one line of body copy
 * and the page dots; Skip at the bottom left and Next at the bottom right.
 * The last step trades both for one full-width call.
 *
 *   1. Two worlds. One platform.  Renting and buying, and stays.
 *   2. What verified means.       A person checked the agent, by hand.
 *   3. Talk first, pay when sure. Message and inspect before money moves.
 *   4. The ending.                A stranger: Create account (or Sign in).
 *                                 Somebody signed in: one Continue into the
 *                                 app, through the interests question only
 *                                 while it is unanswered.
 *
 * THE MOTION IS ONE NUMBER. `pos` is where the carousel is, as a fractional
 * step (1.4 is forty percent of the way from step two to step three). Every
 * art layer reads its distance from it (`--d`), so the sky, the hero object
 * and the small satellites parallax at three depths and cross-fade; the dot
 * pill slides along it and stretches in transit. A drag writes `pos` straight
 * from the finger (rubber-banded past either end); a release, a tap, a key or
 * the history springs it home with the shared spring (`site/landing/spring`).
 * Transform and opacity only. The headline and the body of the step that
 * lands rise in word by word (welcome.css). Quiet (reduced motion, Calm,
 * Off): no spring and no drag physics; the step cross-fades on the short
 * ladder, and Off lands it at once.
 *
 * WHAT EACH CONTROL WRITES, because a first run with painted buttons is a
 * picture of onboarding:
 *
 *   Next                moves one step on. Reaching the last step records
 *                       this device as shown (`rememberFirstRunSeen`).
 *   Skip, a stranger    records the device, then carries on to where they
 *                       were going (`?next=`), or lands on the ending.
 *   Skip, a member      records the opener on the profile AND skips the
 *                       question (`markWelcomeSeen` + `skipInterests`, the
 *                       real skip that never asks again), then home.
 *   Continue, a member  `onDone`: records the opener on the profile, then the
 *                       interests question if it is still unasked, else home.
 *   The two doors       real links to `/sign-up` and `/sign-in`, keeping the
 *                       address the person asked for.
 *   Back                every step is a history entry, so the drawn back
 *                       button (steps two to four), the browser's back and
 *                       Android's hardware back all step to the previous
 *                       step; from step one back leaves as it came.
 *
 * THE INTERESTS QUESTION STAYS, for a signed-in person who has not answered
 * it: it is the only answer the product acts on at the door (it ranks home
 * and search), and `InterestChoices` is its one real, tested implementation.
 * It follows the steps as a fifth beat with no dot of its own.
 *
 * Swipe or drag, arrow keys and the dots all move between steps; every change
 * is announced in a polite live region, and only the step on screen is in the
 * accessibility tree (the other art layers are decorative).
 */

type Viewer = "member" | "guest";

type Slide = {
  key: string;
  titleA: string;
  titleB: string;
  body: string;
  art: Art;
};

const HERO = "/brand/glass/hero";
const GLASS = "/brand/glass";

/* A page turn: a little softer than the landing's card flick, with a hint of
   settle rather than a bounce (critical damping here is about 28). */
const SPRING_PAGE: SpringConfig = { stiffness: 210, damping: 25 };
/* How far the finger must travel (share of the width) or how fast (px/s)
   before a release turns the page. */
const FLICK_SHARE = 0.18;
const FLICK_SPEED = 450;
/* Movement before a press becomes a horizontal drag rather than a tap or a
   vertical scroll. */
const DRAG_SLOP_PX = 8;

/**
 * How opaque a step's art is at distance `d` from the carousel's position.
 * The step BEHIND (lower in the stack, `d <= 0`) stays fully opaque and the
 * one arriving over it fades in: two half-faded layers over each other let
 * the ink behind them through, and the sky dimmed at the midpoint of every
 * turn. Visibility still hides a layer a whole step away.
 */
function layerOpacity(d: number): number {
  return d <= 0 ? 1 : Number((1 - Math.min(d, 1)).toFixed(4));
}

export function FirstRun({
  t,
  interests,
  showCards,
  asked = false,
  viewer = "member",
  next = null,
  arrival = null,
  atChoice = false,
  fromSignUpForm = false,
  asks = null,
}: {
  t: Dictionary;
  interests: ComponentProps<typeof InterestChoices>["initial"];
  /* False for a member who has already been shown the steps, on this
     device or another: they go straight to the question. */
  showCards: boolean;
  /* True when the question has been answered or skipped already. */
  asked?: boolean;
  viewer?: Viewer;
  /* A same-origin path the person was on their way to, already vetted. */
  next?: string | null;
  /**
   * What a stranger was stopped on the way to (V-18). Present, first run
   * opens on the account choice headed with it and the steps stay one dot
   * away; absent, it is the cold start and opens on step one.
   */
  arrival?: Arrival | null;
  /** A returning device going nowhere: open on the closing choice. */
  atChoice?: boolean;
  /**
   * The steps were opened from the sign-up form's "What Vallo is" link, and
   * `next` is that form. The control under the steps then reads "Back to
   * sign up" rather than Skip (E2E audit L-5): it already returned to the
   * form, and nothing on the first-run path is labelled skip.
   */
  fromSignUpForm?: boolean;
  /**
   * A member only: what the one-screen sign-up no longer asks (A1), shown
   * beside the interests question. Null when there is nothing left to ask.
   */
  asks?: Omit<ComponentProps<typeof ArrivalAsks>, "t"> | null;
}) {
  const router = useRouter();
  const w = t.welcomeCards.twoWorlds;
  const f = t.welcomeCards.firstRun;
  const guest = viewer === "guest";
  /* Only a guest with the form to go back to: `skip` sends a guest to `next`. */
  const backToForm = guest && fromSignUpForm && isSignUpForm(next);
  const askQuestion = !guest && !asked;
  const { quiet } = useMotionGate();

  const wall = guest && arrival ? wallHeading(arrival.reason, t.shape.wall) : null;

  const last: Slide = guest
    ? {
        key: "choice",
        titleA: wall ? wall.titleA : f.choice.titleA,
        titleB: wall ? wall.titleB : f.choice.titleB,
        body: wall ? wall.body : f.choice.body,
        art: {
          hero: { kind: "coin" },
          satellites: [
            { src: `${GLASS}/search-home.png`, at: "tl" },
            { src: `${GLASS}/user-check.png`, at: "br" },
          ],
          tags: [f.choice.left, f.choice.right],
          sky: "night",
          label: f.choice.art,
        },
      }
    : {
        key: "member",
        titleA: f.member.titleA,
        titleB: f.member.titleB,
        body: askQuestion ? f.member.bodyAsk : f.member.bodyDone,
        art: {
          hero: { kind: "coin" },
          satellites: [
            { src: `${GLASS}/modern-house.png`, at: "tl" },
            { src: `${GLASS}/stays-hotel-palms.png`, at: "br" },
          ],
          tags: [w.property, w.stays],
          sky: "night",
          label: f.worldsArt,
        },
      };

  const slides: Slide[] = [
    {
      key: "worlds",
      titleA: w.titleA,
      titleB: w.titleB,
      body: w.body,
      art: {
        hero: { kind: "image", src: `${HERO}/hero-property.png` },
        satellites: [
          { src: `${GLASS}/stays-hotel-palms.png`, at: "tr" },
          { src: `${GLASS}/keys-home.png`, at: "bl" },
        ],
        tags: [w.property, w.stays],
        sky: "dawn",
        label: `${f.worldsArt}. ${w.property}: ${w.propertyHint}. ${w.stays}: ${w.staysHint}.`,
      },
    },
    {
      key: "verified",
      titleA: f.verified.titleA,
      titleB: f.verified.titleB,
      body: f.verified.body,
      art: {
        hero: { kind: "image", src: `${HERO}/hero-protected.png` },
        satellites: [
          { src: `${GLASS}/user-verified.png`, at: "tl" },
          { src: `${GLASS}/id-card-check.png`, at: "br" },
        ],
        sky: "noon",
        label: f.verified.art,
      },
    },
    {
      key: "safe",
      titleA: f.safe.titleA,
      titleB: f.safe.titleB,
      body: f.safe.body,
      art: {
        hero: { kind: "image", src: `${HERO}/hero-app.png` },
        satellites: [
          { src: `${GLASS}/chat-duo.png`, at: "tl" },
          { src: `${GLASS}/receipt-check.png`, at: "br" },
        ],
        tags: [f.safe.left, f.safe.right],
        sky: "dusk",
        label: f.safe.art,
      },
    },
    last,
  ];
  const total = slides.length;
  const lastIndex = total - 1;
  /* A stranger with a destination starts on the choice (V-18). */
  const initialIndex = wall || (guest && atChoice) ? lastIndex : 0;

  const [beat, setBeat] = useState<"slides" | "question">(
    !guest && !showCards ? "question" : "slides",
  );
  const [index, setIndex] = useState(initialIndex);
  const [announce, setAnnounce] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  /* Whether the device memory really stuck, so an exit can carry the flag
     instead when a browser refuses the cookie. */
  const stuck = useRef<boolean | null>(null);

  const remember = useCallback(() => {
    if (stuck.current === null) stuck.current = rememberFirstRunSeen();
    return stuck.current;
  }, []);

  /* Called from a handler only, never while rendering: it writes the cookie. */
  const onward = useCallback(
    (path: string) => (remember() ? path : withPassedFlag(path)),
    [remember],
  );

  /* A door is a real link (it middle-clicks, it prefetches). If the device
     refused the cookie, the click is rerouted to the same place with the
     passed flag, so the page behind it does not send them back here. */
  const door = (path: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (remember()) return;
    e.preventDefault();
    router.push(withPassedFlag(path));
  };

  /* Every move is announced from here, the one place a step changes, so
     the live region speaks for dots, buttons, swipes and keys alike and says
     nothing on first paint. */
  const titles = slides.map((s) => `${s.titleA} ${s.titleB}`).join("\n");
  const titleList = titles.split("\n");

  const announceSlide = useCallback(
    (n: number) =>
      setAnnounce(
        f.slideLive
          .replace("{n}", String(n + 1))
          .replace("{total}", String(lastIndex + 1))
          .replace("{title}", titleList[n] ?? ""),
      ),
    // titleList is derived from titles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [f.slideLive, lastIndex, titles],
  );

  /*
   * EVERY STEP IS A HISTORY ENTRY, so back means the previous step.
   *
   * A move pushes an entry on the same address carrying the step number, so
   * the browser's back, a swipe-back gesture and Android's hardware back
   * (Capacitor's default hands it to the web view's history) all step back a
   * step rather than leaving first run. From the first step back leaves as
   * it always did. The current history state is spread in, because the App
   * Router keeps its own tree in it and an entry without that tree makes it
   * reload on the way back.
   */
  const goTo = useCallback(
    (to: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, to));
      if (clamped === index) return false;
      try {
        window.history.pushState({ ...(window.history.state ?? {}), nfGsSlide: clamped }, "");
      } catch {
        /* A sandbox that refuses history still moves the step. */
      }
      setIndex(clamped);
      announceSlide(clamped);
      return true;
    },
    [lastIndex, index, announceSlide],
  );

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { nfGsSlide?: unknown } | null)?.nfGsSlide;
      const n = typeof s === "number" ? s : initialIndex;
      setIndex(n);
      announceSlide(n);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initialIndex, announceSlide]);

  /* Reaching the end is having been shown it. Also covers the returning
     stranger who starts on the choice. */
  useEffect(() => {
    if (beat === "slides" && index === lastIndex) remember();
  }, [beat, index, lastIndex, remember]);

  /* A member who starts at the question was shown the steps already, maybe
     only on this device before they had an account. Put it on the profile so
     every other device knows too. Quiet and idempotent. */
  useEffect(() => {
    if (!guest && !showCards) void markWelcomeSeen();
  }, [guest, showCards]);

  /* The market a landing tile named, kept for the interests question after
     sign-up (V-18). A suggestion only; nothing is saved from it. */
  const carriedInterest = guest ? (arrival?.interest ?? null) : null;
  useEffect(() => {
    if (carriedInterest) rememberFirstInterest(carriedInterest);
  }, [carriedInterest]);

  useEffect(() => {
    if (beat !== "slides") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, index, goTo]);

  /* ------------------------------------------------------------------ */
  /* THE CAROUSEL'S ONE NUMBER, AND WHAT PAINTS IT                      */
  /* ------------------------------------------------------------------ */

  const rootRef = useRef<HTMLElement>(null);
  const pos = useRef(initialIndex);
  /* The page's own velocity in px/s along `pos * width`, handed from a
     release to the spring that follows it. */
  const velocity = useRef(0);
  const stopSpring = useRef<(() => void) | null>(null);
  const dragging = useRef(false);

  const widthOf = () => rootRef.current?.getBoundingClientRect().width || window.innerWidth || 1;

  /* Writes `pos` onto the page: custom properties the CSS turns into
     transforms and opacity. Nothing here reads layout. */
  const paint = useCallback((p: number) => {
    const root = rootRef.current;
    if (!root) return;
    const frac = Math.abs(p - Math.round(p));
    root.style.setProperty("--nf-gs-pos", p.toFixed(4));
    /* The dot pill stretches in transit and is at rest on a step. */
    root.style.setProperty("--nf-gs-stretch", (1 + Math.min(frac, 0.5) * 1.4).toFixed(3));
    root.querySelectorAll<HTMLElement>("[data-layer]").forEach((layer) => {
      const d = Number(layer.dataset.layer) - p;
      const a = Math.min(Math.abs(d), 1);
      layer.style.setProperty("--d", d.toFixed(4));
      layer.style.setProperty("--a", a.toFixed(4));
      layer.style.opacity = String(layerOpacity(d));
      layer.style.visibility = a >= 1 ? "hidden" : "visible";
    });
    root.querySelectorAll<HTMLElement>("[data-dot]").forEach((dot) => {
      const a = Math.min(Math.abs(Number(dot.dataset.dot) - p), 1);
      dot.style.setProperty("--a", a.toFixed(4));
    });
  }, []);

  /* Spring `pos` to a step from wherever it is now, carrying any throw. */
  const settleOn = useCallback(
    (to: number) => {
      stopSpring.current?.();
      stopSpring.current = null;
      if (quiet) {
        pos.current = to;
        velocity.current = 0;
        paint(to);
        return;
      }
      const width = widthOf();
      stopSpring.current = springTo(
        { x: pos.current * width, y: 0 },
        { x: to * width, y: 0 },
        { vx: velocity.current, vy: 0 },
        (x) => {
          pos.current = x / width;
          paint(pos.current);
        },
        () => {
          stopSpring.current = null;
        },
        SPRING_PAGE,
      );
      velocity.current = 0;
    },
    [quiet, paint],
  );

  /* The first paint is the server's (inline styles below); this only keeps
     the numbers true if the beat comes back to the steps. */
  useLayoutEffect(() => {
    if (beat === "slides") paint(pos.current);
  }, [beat, paint]);

  /* Every change of step, from any source, springs the art to it. */
  useEffect(() => {
    if (beat !== "slides" || dragging.current) return;
    settleOn(index);
  }, [index, beat, settleOn]);

  useEffect(() => () => stopSpring.current?.(), []);

  /* THE DRAG. A press becomes a drag only once it has moved sideways more
     than it has moved up or down; a vertical move is left to the page. */
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    axis: "x" | "y" | null;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);

  const setDragShift = (px: number) => {
    rootRef.current?.style.setProperty("--nf-gs-drag", `${px.toFixed(1)}px`);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as Element).closest("button, a, input, label")) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null, samples: [] };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (p.axis === null) {
      if (Math.abs(dx) > DRAG_SLOP_PX && Math.abs(dx) > Math.abs(dy)) {
        p.axis = "x";
        dragging.current = true;
        stopSpring.current?.();
        stopSpring.current = null;
        rootRef.current?.setAttribute("data-dragging", "");
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* A pointer that is already gone. */
        }
      } else if (Math.abs(dy) > DRAG_SLOP_PX) {
        p.axis = "y";
        return;
      } else {
        return;
      }
    }
    if (p.axis !== "x") return;
    p.samples.push({ t: e.timeStamp, x: e.clientX, y: e.clientY });
    if (p.samples.length > 8) p.samples.shift();
    const width = widthOf();
    if (quiet) {
      /* No physics: the words lean with the finger, the art stays. */
      setDragShift(dx * 0.18);
      return;
    }
    let target = index - dx / width;
    /* Past either end the page resists, and never passes a quarter; the
       words resist with it. */
    const pastEnd = target < 0 || target > lastIndex;
    if (target < 0) target = -rubber(-target * width, width * 0.25) / width;
    else if (target > lastIndex) target = lastIndex + rubber((target - lastIndex) * width, width * 0.25) / width;
    pos.current = target;
    paint(target);
    setDragShift(pastEnd ? rubber(dx, width * 0.06) : dx * 0.18);
  };

  const endPress = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || p.axis !== "x") return;
    dragging.current = false;
    rootRef.current?.removeAttribute("data-dragging");
    setDragShift(0);
    const { vx } = releaseVelocity(p.samples);
    const dir = cancelled
      ? 0
      : flickDirection(e.clientX - p.x, e.clientY - p.y, vx, widthOf() * FLICK_SHARE, FLICK_SPEED);
    /* The finger's speed, turned into the page's (the page moves the other
       way), so the spring picks up the throw. */
    velocity.current = -vx;
    if (dir === 0 || !goTo(index + dir)) settleOn(index);
  };

  /* Leaving first run for the app is a full navigation, replacing this entry.
     Found in the final pass: a client-side replace to `/home` that the proxy
     answers with a redirect (a session that has lapsed, or the fixture
     harness signed out) hung mid-transition with the button busy. A document
     load follows any redirect, and the step entries this screen pushed are
     not left behind in the back stack of the app. */
  const leave = (path: string) => {
    window.location.replace(path);
  };

  /* A member finishing the steps. */
  const onDone = () => {
    setError("");
    start(async () => {
      remember();
      await markWelcomeSeen();
      if (askQuestion) {
        setBeat("question");
        return;
      }
      leave(next ?? "/home");
    });
  };

  const skip = () => {
    setError("");
    if (guest) {
      if (next) {
        router.push(onward(next));
        return;
      }
      remember();
      goTo(lastIndex);
      return;
    }
    start(async () => {
      remember();
      const [, skipped] = await Promise.all([markWelcomeSeen(), skipInterests()]);
      if (!skipped.ok) {
        setError(skipped.error);
        return;
      }
      forgetFirstInterest();
      leave(next ?? "/home");
    });
  };

  const slide = slides[index] ?? slides[0]!;
  const onLast = index === lastIndex;

  /*
   * The doors, keeping whatever the person was on their way to.
   *
   * CREATE ACCOUNT USED TO DROP IT (audit UX-02, R16). With `next` set to the
   * wall's `/sign-in?next=/search...`, the sign-in door kept it and the
   * sign-up door fell back to a bare `/sign-up`, so a stranger who chose to
   * make an account instead of signing in lost the thing that was shared with
   * them. Both doors now carry the destination: the door they came through
   * keeps its whole address (its notice included), and the other door is
   * built from the destination underneath it, through `withNext`, which drops
   * anything that is not a safe same-origin path.
   */
  const signUpHref =
    next && /^\/sign-up(?:[/?#]|$)/.test(next) ? next : withNext("/sign-up", destinationOf(next));
  const signInHref =
    next && /^\/sign-in(?:[/?#]|$)/.test(next)
      ? next
      : arrival
        ? withNext("/sign-in", arrival.destination)
        : "/sign-in";
  /* The primary door is the one the heading names (V-18). Without a heading,
     the one they came through. */
  const signInFirst = wall ? wall.primary === "sign-in" : signInHref !== "/sign-in";

  if (beat === "question") {
    return (
      <div className="nf-gs-col nf-gs-col--question" data-testid="first-run">
        <div className="nf-gs-question__sky" aria-hidden="true">
          <span className="nf-gs-orb nf-gs-orb--a" />
          <span className="nf-gs-orb nf-gs-orb--b" />
        </div>
        <Lockup onCanvas />
        <div className="nf-gs-question">
          <h1 className="nf-gs-title nf-gs-title--question">
            <RiseWords text={t.interests.question} />
          </h1>
          <p className="nf-gs-sub nf-gs-rise">
            {t.interests.screenSubtitle}. {t.interests.note}
          </p>
          <p className="nf-gs-note nf-gs-rise">{t.welcomeCards.three.body}</p>
          <div className="nf-gs-question__choices nf-gs-rise">
            <InterestChoices
              initial={interests}
              t={t}
              extra={asks ? <ArrivalAsks t={t} {...asks} /> : undefined}
            />
          </div>
        </div>
      </div>
    );
  }

  const stepName = (n: number) => w.step.replace("{n}", String(n + 1)).replace("{total}", String(total));

  const primaryDoor = signInFirst
    ? { href: signInHref, label: f.choice.signIn, testId: "welcome-sign-in" }
    : { href: signUpHref, label: f.choice.create, testId: "welcome-create" };
  const secondDoor = signInFirst
    ? { href: signUpHref, label: f.choice.create, testId: "welcome-create" }
    : { href: signInHref, label: f.choice.signIn, testId: "welcome-sign-in" };

  return (
    <div className="nf-gs-steps nf-slate" data-testid="first-run">
      {/* Back, on steps two to four only: reference 42 draws none on the
          first, where back leaves first run the way it came. It steps
          through the same history the hardware button does. */}
      {index !== initialIndex && (
        <BackControl
          onBack={() => {
            /* A step entry always has the previous step behind it; anything
               else (a restored tab) steps without touching history. */
            if (isInPageStep(window.history.state)) window.history.back();
            else {
              setIndex(index - 1);
              announceSlide(index - 1);
            }
          }}
          label={t.common.back}
          surface="round"
          className="nf-gs-back"
          data-testid="welcome-back"
        />
      )}

      <section
        ref={rootRef}
        className="nf-gs-carousel"
        aria-roledescription="carousel"
        aria-label={f.carousel}
        data-quiet={quiet ? "" : undefined}
        style={{ "--nf-gs-pos": initialIndex, "--nf-gs-stretch": 1 } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPress(e, false)}
        onPointerCancel={(e) => endPress(e, true)}
      >
        <div className="nf-gs-art">
          {slides.map((s, i) => {
            const d = i - initialIndex;
            const a = Math.min(Math.abs(d), 1);
            return (
              <div
                key={s.key}
                className="nf-gs-layer"
                data-layer={i}
                data-sky={s.art.sky}
                aria-hidden="true"
                style={
                  {
                    "--d": d,
                    "--a": a,
                    opacity: layerOpacity(d),
                    visibility: a >= 1 ? "hidden" : "visible",
                  } as CSSProperties
                }
              >
                <StepArt art={s.art} priority={i === initialIndex} />
              </div>
            );
          })}
          <Lockup />
          {/* What the picture on screen shows, for a reader. */}
          <p className="sr-only">{slide.art.label}</p>
        </div>

        <div className="nf-gs-copy">
          <div className="nf-gs-stack">
            {/* Every step's words, invisible, in the same cell as the step on
                screen: the block is as tall as the longest step at this width,
                so the dots and the controls never jump between steps, and no
                line count has to be guessed per phone. */}
            {slides.map((s) => (
              <div key={`size-${s.key}`} className="nf-gs-slide nf-gs-slide--sizer" aria-hidden="true">
                <p className="nf-gs-title">
                  <span className="nf-gs-title__a">{s.titleA}</span>
                  <span className="nf-gs-title__b">{s.titleB}</span>
                </p>
                <p className="nf-gs-sub">{s.body}</p>
              </div>
            ))}
            <div
              key={slide.key}
              className="nf-gs-slide"
              role="group"
              aria-roledescription="slide"
              aria-label={stepName(index)}
              data-slide={slide.key}
            >
              <h1 className="nf-gs-title">
                <span className="nf-gs-title__a">
                  <RiseWords text={slide.titleA} />
                </span>
                <span className="nf-gs-title__b">
                  <RiseWords text={slide.titleB} start={wordsIn(slide.titleA)} />
                </span>
              </h1>
              <p
                className="nf-gs-sub nf-gs-rise"
                style={{ "--nf-i": wordsIn(slide.titleA) + wordsIn(slide.titleB) } as CSSProperties}
              >
                {slide.body}
              </p>
            </div>
          </div>

          <div className="nf-gs-dots" role="group" aria-label={t.welcomeCards.label}>
            <span className="nf-gs-dots__bar" aria-hidden="true" />
            {slides.map((s, i) => {
              const a = Math.min(Math.abs(i - initialIndex), 1);
              return (
                <button
                  key={s.key}
                  type="button"
                  className="nf-gs-dot"
                  data-dot={i}
                  style={{ "--a": a } as CSSProperties}
                  aria-label={stepName(i)}
                  aria-current={i === index ? "step" : undefined}
                  onClick={() => goTo(i)}
                  data-testid={`welcome-dot-${i + 1}`}
                >
                  <span />
                </button>
              );
            })}
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announce}
        </p>

        <div className={onLast ? "nf-gs-foot nf-gs-foot--last" : "nf-gs-foot"}>
          {!onLast ? (
            <>
              <button
                type="button"
                className="nf-gs-skip"
                onClick={skip}
                disabled={pending}
                data-testid={backToForm ? "welcome-back-to-sign-up" : "welcome-skip-all"}
              >
                <span>{backToForm ? t.welcomeCards.backToSignUp : t.welcomeCards.skip}</span>
                <UiIcon name="chevron-right" size={16} />
              </button>
              <Button
                variant="primary"
                size="lg"
                className="nf-slate-pill nf-gs-next"
                onClick={() => goTo(index + 1)}
                data-testid={index === 0 ? "welcome-get-started" : "welcome-next"}
              >
                <span>{f.next}</span>
                <UiIcon name="arrow-right" size={20} />
              </Button>
            </>
          ) : guest ? (
            <div className="nf-gs-doors">
              <ButtonLink
                variant="primary"
                size="lg"
                full
                href={primaryDoor.href}
                onClick={door(primaryDoor.href)}
                className="nf-slate-pill nf-gs-cta"
                data-testid={primaryDoor.testId}
              >
                {primaryDoor.label}
              </ButtonLink>
              <ButtonLink
                variant="ghost"
                size="lg"
                full
                href={secondDoor.href}
                onClick={door(secondDoor.href)}
                className="nf-gs-second"
                data-testid={secondDoor.testId}
              >
                {secondDoor.label}
              </ButtonLink>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              full
              className="nf-slate-pill nf-gs-cta"
              onClick={onDone}
              loading={pending}
              data-testid="welcome-continue"
            >
              <span>{f.member.continue}</span>
              <UiIcon name="arrow-right" size={20} />
            </Button>
          )}

          {error && (
            <p role="alert" className="nf-gs-error">
              {error}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
