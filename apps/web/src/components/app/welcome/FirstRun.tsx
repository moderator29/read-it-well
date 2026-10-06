"use client";

import "@/app/welcome/onboarding-motion.css";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BackControl } from "@/components/ui/BackControl";
import { isInPageStep } from "@/lib/nav/in-page-step";
import { Button, ButtonLink } from "@/components/ui/Button";
import { markWelcomeSeen, skipInterests } from "@/lib/interests/actions";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { releaseVelocity } from "@/components/site/landing/spring";
import { QuestionBeat } from "./QuestionBeat";
import type { InterestChoices } from "./InterestChoices";
import type { ArrivalAsks } from "./ArrivalAsks";
import { VectorMark, VectorWordmark } from "@/components/auth/VectorMark";
import { TourPager } from "./TourPager";
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
import { KnowScene, MoveInScene, TalkScene, WorldsScene } from "./OnboardingScenes";
import {
  dragPose,
  keyStep,
  motionPlan,
  sceneState,
  skipPlan,
  swipeStep,
} from "./onboarding-flow";

/**
 * Get started IN MOTION (30 September), to the founder's onboarding video
 * (`docs/design/references/2026-09-29/51` to `53`) inside the full-page steps
 * of `42` and `43`.
 *
 * THE SHAPE OF A STEP, top to bottom:
 *
 *   back (steps two on), the Vallo lockup, Skip
 *   the progress bar, one segment per step, filling as you go
 *   the SCENE: the founder's clay art for the step in a rounded card, with
 *     chips in our components' style arriving over it one after another and
 *     then floating gently (`OnboardingScenes.tsx`)
 *   a big two-line title and the body, arriving after the scene
 *   one full-width pill: Continue, and on the last step the real call
 *
 * On a wide screen the scene takes the left and the words and the pill the
 * right. The rules (which step a key or a swipe lands on, what Skip does,
 * what moves under each motion setting) are pure functions in
 * `onboarding-flow.ts`, tested on their own.
 *
 *   1. Two worlds. One platform.  Renting and buying, and stays.
 *   2. Verified means a person    The shield and the ID under a scan frame,
 *      checked.                   the Verified agent badge and the Record.
 *   3. Talk first. Pay when sure. A conversation, then Pay on Vallo.
 *   4. The ending.                The keys and an Example move-in total. A
 *                                 stranger: Create account (or Sign in).
 *                                 Somebody signed in: one Continue into the
 *                                 app, through the interests question only
 *                                 while it is unanswered.
 *
 * MOTION. A step change slides the scenes sideways and crossfades them
 * (transform and opacity only, `app/welcome/onboarding-motion.css`); a drag
 * moves them with the finger. Reduced motion, Calm and Off: every step lands
 * at once, nothing staggers, floats or counts. A still background (Living
 * backgrounds off, data saver) keeps the arrivals and drops the float.
 *
 * WHAT EACH CONTROL WRITES, because a first run with painted buttons is a
 * picture of onboarding:
 *
 *   Continue            moves one step on. Reaching the last step records
 *                       this device as shown (`rememberFirstRunSeen`).
 *   Skip, a stranger    records the device, then carries on to where they
 *                       were going (`?next=`), or lands on the ending.
 *   Skip, a member      records the opener on the profile AND skips the
 *                       question (`markWelcomeSeen` + `skipInterests`, the
 *                       real skip that never asks again), then home.
 *   Continue, a member  `onDone`: records the opener on the profile, then the
 *   (last step)         interests question if it is still unasked, else home.
 *   The two doors       real links to `/sign-up` and `/sign-in`, keeping the
 *                       address the person asked for.
 *   Back                every step is a history entry, so the drawn back
 *                       button, the browser's back and Android's hardware
 *                       back all step to the previous step; from step one
 *                       back leaves as it came.
 *
 * Swipe, the arrow keys (Home and End too) and the progress segments all move
 * between steps; every change is announced in a polite live region and the
 * new step's title takes focus when the change came from inside the flow.
 * Only the step on screen is in the accessibility tree.
 */

type Viewer = "member" | "guest";

type Slide = {
  key: string;
  titleA: string;
  titleB: string;
  body: string;
  /** One sentence for a reader: what the scene shows. */
  label: string;
};

/* Movement before a press becomes a horizontal drag rather than a tap or a
   vertical scroll. */
const DRAG_SLOP_PX = 8;

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
   * opens on the account choice headed with it and the steps stay one
   * segment away; absent, it is the cold start and opens on step one.
   */
  arrival?: Arrival | null;
  /** A returning device going nowhere: open on the closing choice. */
  atChoice?: boolean;
  /**
   * The steps were opened from the sign-up form's "What Vallo is" link, and
   * `next` is that form. The control at the top then reads "Back to sign
   * up" rather than Skip (E2E audit L-5): it already returned to the form,
   * and nothing on the first-run path is labelled skip.
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
  const m = t.onboardingMotion;
  const guest = viewer === "guest";
  /* Only a guest with the form to go back to: `skip` sends a guest to `next`. */
  const backToForm = guest && fromSignUpForm && isSignUpForm(next);
  const askQuestion = !guest && !asked;
  const gate = useMotionGate();
  const motion = motionPlan(gate);

  const wall = guest && arrival ? wallHeading(arrival.reason, t.shape.wall) : null;

  const last: Slide = guest
    ? {
        key: "choice",
        titleA: wall ? wall.titleA : f.choice.titleA,
        titleB: wall ? wall.titleB : f.choice.titleB,
        body: wall ? wall.body : f.choice.body,
        label: m.moveIn.label,
      }
    : {
        key: "member",
        titleA: f.member.titleA,
        titleB: f.member.titleB,
        body: askQuestion ? f.member.bodyAsk : f.member.bodyDone,
        label: m.moveIn.label,
      };

  const slides: Slide[] = [
    { key: "worlds", titleA: w.titleA, titleB: w.titleB, body: w.body, label: m.worlds.label },
    {
      key: "verified",
      titleA: f.verified.titleA,
      titleB: f.verified.titleB,
      body: f.verified.body,
      label: m.know.label,
    },
    { key: "safe", titleA: f.safe.titleA, titleB: f.safe.titleB, body: f.safe.body, label: m.talk.label },
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
  /* Bumped on every arrival, so the move-in figure counts again each time. */
  const [visit, setVisit] = useState(0);
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
     the live region speaks for segments, buttons, swipes and keys alike and
     says nothing on first paint. */
  const titles = slides.map((s) => `${s.titleA} ${s.titleB}`).join("\n");

  const announceSlide = useCallback(
    (n: number) =>
      setAnnounce(
        f.slideLive
          .replace("{n}", String(n + 1))
          .replace("{total}", String(lastIndex + 1))
          .replace("{title}", titles.split("\n")[n] ?? ""),
      ),
    [f.slideLive, lastIndex, titles],
  );

  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  /* Focus follows a change made from inside the flow, never the first paint. */
  const moveFocus = useRef(false);

  const land = useCallback(
    (n: number) => {
      setIndex(n);
      setVisit((v) => v + 1);
      announceSlide(n);
      const active = document.activeElement;
      moveFocus.current =
        !active || active === document.body || !!rootRef.current?.contains(active);
    },
    [announceSlide],
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
      land(clamped);
      return true;
    },
    [lastIndex, index, land],
  );

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { nfGsSlide?: unknown } | null)?.nfGsSlide;
      land(typeof s === "number" ? s : initialIndex);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initialIndex, land]);

  /* Marks the flow as live once hydrated, so a script driving it (the
     browser checks in tests/) knows a press will be heard. */
  useEffect(() => {
    rootRef.current?.setAttribute("data-hydrated", "");
  }, [beat]);

  /* The new step's title takes focus, so a keyboard or screen reader lands
     on what just arrived rather than on a button that moved. */
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    titleRef.current?.focus({ preventScroll: true });
  }, [index]);

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
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const to = keyStep(e.key, index, lastIndex);
      if (to === null) return;
      e.preventDefault();
      goTo(to);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, index, lastIndex, goTo]);

  /* ------------------------------------------------------------------ */
  /* THE DRAG                                                            */
  /* ------------------------------------------------------------------ */

  /* A press becomes a drag only once it has moved sideways more than up or
     down; a vertical move is left to the page. While it drags, the scenes
     follow the finger (`dragPose`) and the words lean with it; the release
     either turns the step (`swipeStep`) or lets everything settle back. */
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    axis: "x" | "y" | null;
    samples: { t: number; x: number; y: number }[];
  } | null>(null);

  const widthOf = () => rootRef.current?.getBoundingClientRect().width || window.innerWidth || 1;

  const paintDrag = (dx: number | null) => {
    const root = rootRef.current;
    if (!root) return;
    const scenes = root.querySelectorAll<HTMLElement>("[data-om-scene]");
    if (dx === null) {
      root.removeAttribute("data-dragging");
      root.style.removeProperty("--om-lean");
      scenes.forEach((el) => {
        el.style.removeProperty("--om-shift");
        el.style.removeProperty("--om-alpha");
      });
      return;
    }
    root.setAttribute("data-dragging", "");
    const width = widthOf();
    /* Past either end the scenes resist: a third of the pull. */
    const pastEnd = (dx > 0 && index === 0) || (dx < 0 && index === lastIndex);
    const share = (pastEnd ? dx / 3 : dx) / width;
    root.style.setProperty("--om-lean", `${(dx * (pastEnd ? 0.06 : 0.12)).toFixed(1)}px`);
    scenes.forEach((el) => {
      const pose = dragPose(Number(el.dataset.omScene) - index, share);
      el.style.setProperty("--om-shift", String(pose.shift));
      el.style.setProperty("--om-alpha", String(pastEnd && pose.shift === share ? 1 : pose.opacity));
    });
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
    /* Quiet: nothing follows the finger; the release still turns the step. */
    if (motion.follow) paintDrag(dx);
  };

  const endPress = (e: React.PointerEvent<HTMLElement>, cancelled: boolean) => {
    const p = press.current;
    press.current = null;
    if (!p || p.id !== e.pointerId || p.axis !== "x") return;
    paintDrag(null);
    if (cancelled) return;
    const to = swipeStep({
      dx: e.clientX - p.x,
      dy: e.clientY - p.y,
      vx: releaseVelocity(p.samples).vx,
      width: widthOf(),
      index,
      last: lastIndex,
    });
    goTo(to);
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
    const plan = skipPlan({ guest, next });
    if (plan.kind === "go") {
      router.push(onward(plan.to));
      return;
    }
    if (plan.kind === "ending") {
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
      leave(plan.to);
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
    return <QuestionBeat t={t} interests={interests} asks={asks} />;
  }

  const stepName = (n: number) => w.step.replace("{n}", String(n + 1)).replace("{total}", String(total));

  const primaryDoor = signInFirst
    ? { href: signInHref, label: f.choice.signIn, testId: "welcome-sign-in" }
    : { href: signUpHref, label: f.choice.create, testId: "welcome-create" };
  const secondDoor = signInFirst
    ? { href: signUpHref, label: f.choice.create, testId: "welcome-create" }
    : { href: signInHref, label: f.choice.signIn, testId: "welcome-sign-in" };

  const scene = (key: string, i: number): ReactNode => {
    const priority = i === initialIndex;
    switch (key) {
      case "worlds":
        return <WorldsScene t={t} priority={priority} />;
      case "verified":
        return <KnowScene copy={m} priority={priority} />;
      case "safe":
        return <TalkScene copy={m} priority={priority} />;
      default:
        return <MoveInScene t={t} copy={m} priority={priority} />;
    }
  };

  const showBack = index > 0 && index !== initialIndex;

  return (
    <section
      ref={rootRef}
      className="nf-om"
      data-testid="first-run"
      aria-roledescription="carousel"
      aria-label={f.carousel}
      data-step={index + 1}
      data-last={onLast ? "" : undefined}
      data-quiet={motion.slide ? undefined : ""}
      data-still={motion.idle ? undefined : ""}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPress(e, false)}
      onPointerCancel={(e) => endPress(e, true)}
    >
      <span className="nf-om-glow" aria-hidden="true" />

      <div className="nf-om-top">
        <span className="nf-om-top__side">
          {/* Back, from step two on (reference 51 draws none on the first,
              where back leaves first run the way it came). It steps through
              the same history the hardware button does. */}
          {showBack && (
            <BackControl
              onBack={() => {
                /* A step entry always has the previous step behind it;
                   anything else (a restored tab) steps without history. */
                if (isInPageStep(window.history.state)) window.history.back();
                else land(index - 1);
              }}
              label={t.common.back}
              surface="round"
              className="nf-om-back"
              data-testid="welcome-back"
            />
          )}
        </span>
        {/* Always dark (the founder, 30 September): the lockup is the vector
            mark and wordmark in the night's ink, so it is sharp at any scale. */}
        <span className="nf-om-lockup" role="img" aria-label="Vallo">
          <VectorMark size={22} />
          <VectorWordmark height={11} />
        </span>
        <span className="nf-om-top__side nf-om-top__side--end">
          {!onLast && (
            <button
              type="button"
              className="nf-om-skip"
              onClick={skip}
              disabled={pending}
              data-testid={backToForm ? "welcome-back-to-sign-up" : "welcome-skip-all"}
            >
              {backToForm ? t.welcomeCards.backToSignUp : t.welcomeCards.skip}
            </button>
          )}
        </span>
      </div>

      <div className="nf-om-stage">
        {slides.map((s, i) => {
          const state = sceneState(i, index);
          return (
            <div
              key={s.key}
              className="nf-om-scene"
              data-om-scene={i}
              data-state={state}
              data-scene={s.key}
              /* A page that is not on screen takes no focus and is not read. */
              inert={state !== "active"}
              aria-hidden={state !== "active" ? true : undefined}
              style={{ visibility: Math.abs(i - index) >= 2 ? "hidden" : undefined } as CSSProperties}
            >
              {scene(s.key, i)}
            </div>
          );
        })}
      </div>
      {/* What the scene on screen shows, for a reader. */}
      <p className="sr-only">{slide.label}</p>

      <div className="nf-om-copy">
        {/* Every step's words, invisible, in the same cell as the step on
            screen: the block is as tall as the longest step at this width, so
            the pill never jumps between steps. */}
        {slides.map((s) => (
          <div key={`size-${s.key}`} className="nf-om-words nf-om-words--sizer" aria-hidden="true">
            <p className="nf-om-title">
              <span className="nf-om-title__a">{s.titleA}</span> <span className="nf-om-title__b">{s.titleB}</span>
            </p>
            <p className="nf-om-body">{s.body}</p>
          </div>
        ))}
        <div
          key={`${slide.key}-${visit}`}
          className="nf-om-words"
          role="group"
          aria-roledescription="slide"
          aria-label={stepName(index)}
          data-slide={slide.key}
        >
          <h1 ref={titleRef} tabIndex={-1} className="nf-om-title">
            <span className="nf-om-title__a">{slide.titleA}</span>{" "}
            <span className="nf-om-title__b">{slide.titleB}</span>
          </h1>
          <p className="nf-om-body">{slide.body}</p>
        </div>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      <div className="nf-om-foot">
        {/* The pager, a sliding pill: where you are, and a way to any page. */}
        <TourPager total={total} index={index} label={m.progress} stepName={stepName} onGo={goTo} />
        {!onLast ? (
          <Button
            variant="primary"
            size="lg"
            full
            className="nf-om-cta"
            onClick={() => goTo(index + 1)}
            data-testid={index === 0 ? "welcome-get-started" : "welcome-next"}
          >
            <span>{m.continue}</span>
            <span className="nf-om-cta__arrow" aria-hidden="true">
              <UiIcon name="arrow-right" size={18} />
            </span>
          </Button>
        ) : guest ? (
          <div className="nf-om-doors">
            <ButtonLink
              variant="primary"
              size="lg"
              full
              href={primaryDoor.href}
              onClick={door(primaryDoor.href)}
              className="nf-om-cta"
              data-testid={primaryDoor.testId}
            >
              <span>{primaryDoor.label}</span>
              <span className="nf-om-cta__arrow" aria-hidden="true">
                <UiIcon name="arrow-right" size={18} />
              </span>
            </ButtonLink>
            <ButtonLink
              variant="ghost"
              size="lg"
              full
              href={secondDoor.href}
              onClick={door(secondDoor.href)}
              className="nf-om-second"
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
            className="nf-om-cta"
            onClick={onDone}
            loading={pending}
            data-testid="welcome-continue"
          >
            <span>{f.member.continue}</span>
            <span className="nf-om-cta__arrow" aria-hidden="true">
              <UiIcon name="arrow-right" size={18} />
            </span>
          </Button>
        )}

        {error && (
          <p role="alert" className="nf-gs-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
