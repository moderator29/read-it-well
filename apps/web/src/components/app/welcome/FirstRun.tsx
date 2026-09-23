"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import type { Dictionary } from "@vallo/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button, ButtonLink } from "@/components/ui/Button";
import { markWelcomeSeen, skipInterests } from "@/lib/interests/actions";
import { InterestChoices } from "./InterestChoices";
import { WelcomeScene, type SceneCentre } from "./WelcomeScene";
import { rememberFirstInterest, rememberFirstRunSeen, withPassedFlag } from "./first-run-seen";
import type { Arrival } from "@/app/welcome/plan";
import { wallHeading } from "./wall-heading";
import type { BrandIconObject } from "@/design-system/icons/BrandIcon";

/**
 * Get started, to its governing image (`2A49E2F7` at the repository root).
 *
 * FOUR SLIDES ON ONE STAGE, the render's four dots:
 *   1. Two worlds. One platform.  Property and Stays, and the coin between.
 *   2. What verified means.       A person checked the agent, by hand.
 *   3. Talk first, pay when sure. The one safety rule, before money moves.
 *   4. The ending.                A stranger: Create account or Sign in.
 *                                 Somebody signed in: one Continue into the
 *                                 app, through the interests question only
 *                                 while it is unanswered.
 * Shown every time it is asked for, signed in or not (the founder's rule of
 * 23 September); nothing inside the platform is visible signed out, so there
 * is no "look around" door.
 * The stage and the chrome stay where they are; only the art and the words
 * change, so moving between slides reads as a change of subject.
 *
 * WHAT EACH CONTROL WRITES, because a first run with painted buttons is a
 * picture of onboarding:
 *
 *   Get Started / Next  move one slide on. Reaching the last slide records
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
 *   Back                every slide is a history entry, so the drawn back
 *                       square (slides two to four), the browser's back and
 *                       Android's hardware back all step to the previous
 *                       slide; from slide one back leaves as it came.
 *
 * THE INTERESTS QUESTION STAYS, for a signed-in person who has not answered
 * it: it is the only answer the product acts on at the door (it ranks home
 * and search), and `InterestChoices` is its one real, tested implementation.
 * It follows the slides as a fifth beat with no dot of its own.
 *
 * Swipe, arrow keys and the dots all move between slides; every change is
 * announced in a polite live region.
 */

type Viewer = "member" | "guest";

type Slide = {
  key: string;
  titleA: string;
  titleB: string;
  body: string;
  art: {
    left: { icon: BrandIconObject; label: string };
    right: { icon: BrandIconObject; label: string };
    centre: SceneCentre;
    label: string;
  };
};

const SWIPE_MIN_PX = 48;

export function FirstRun({
  t,
  interests,
  showCards,
  asked = false,
  viewer = "member",
  next = null,
  arrival = null,
}: {
  t: Dictionary;
  interests: ComponentProps<typeof InterestChoices>["initial"];
  /* False for a member who has already been shown the slides, on this
     device or another: they go straight to the question. */
  showCards: boolean;
  /* True when the question has been answered or skipped already. */
  asked?: boolean;
  viewer?: Viewer;
  /* A same-origin path the person was on their way to, already vetted. */
  next?: string | null;
  /**
   * What a stranger was stopped on the way to (V-18). Present, first run
   * opens on the account choice headed with it and the slides stay one dot
   * away; absent, it is the cold start and opens on slide one.
   */
  arrival?: Arrival | null;
}) {
  const router = useRouter();
  const w = t.welcomeCards.twoWorlds;
  const f = t.welcomeCards.firstRun;
  const guest = viewer === "guest";
  const askQuestion = !guest && !asked;

  const wall = guest && arrival ? wallHeading(arrival.reason, t.shape.wall) : null;

  const last = guest
    ? {
        key: "choice",
        titleA: wall ? wall.titleA : f.choice.titleA,
        titleB: wall ? wall.titleB : f.choice.titleB,
        body: wall ? wall.body : f.choice.body,
        art: {
          left: { icon: "search-home" as const, label: f.choice.left },
          right: { icon: "user-check" as const, label: f.choice.right },
          centre: { kind: "coin" as const },
          label: f.choice.art,
        },
      }
    : {
        key: "member",
        titleA: f.member.titleA,
        titleB: f.member.titleB,
        body: askQuestion ? f.member.bodyAsk : f.member.bodyDone,
        art: {
          left: { icon: "modern-house" as const, label: w.property },
          right: { icon: "stays-hotel-palms" as const, label: w.stays },
          centre: { kind: "coin" as const },
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
        left: { icon: "modern-house", label: w.property },
        right: { icon: "stays-hotel-palms", label: w.stays },
        centre: { kind: "coin" },
        label: `${f.worldsArt}. ${w.property}: ${w.propertyHint}. ${w.stays}: ${w.staysHint}.`,
      },
    },
    {
      key: "verified",
      titleA: f.verified.titleA,
      titleB: f.verified.titleB,
      body: f.verified.body,
      art: {
        left: { icon: "user-verified", label: f.verified.left },
        right: { icon: "id-card-check", label: f.verified.right },
        centre: { kind: "object", icon: "seal-check" },
        label: f.verified.art,
      },
    },
    {
      key: "safe",
      titleA: f.safe.titleA,
      titleB: f.safe.titleB,
      body: f.safe.body,
      art: {
        left: { icon: "chat-duo", label: f.safe.left },
        right: { icon: "wallet", label: f.safe.right },
        centre: { kind: "object", icon: "calendar-check" },
        label: f.safe.art,
      },
    },
    last,
  ];
  const total = slides.length;
  const lastIndex = total - 1;
  /* A stranger with a destination starts on the choice (V-18). */
  const initialIndex = wall ? lastIndex : 0;

  const [beat, setBeat] = useState<"slides" | "question">(
    !guest && !showCards ? "question" : "slides",
  );
  const [index, setIndex] = useState(initialIndex);
  const [announce, setAnnounce] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const swipe = useRef<{ x: number; y: number } | null>(null);
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

  /* Every move is announced from here, the one place a slide changes, so
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
   * EVERY SLIDE IS A HISTORY ENTRY, so back means the previous slide.
   *
   * A move pushes an entry on the same address carrying the slide number, so
   * the browser's back, a swipe-back gesture and Android's hardware back
   * (Capacitor's default hands it to the web view's history) all step back a
   * slide rather than leaving first run. From the first slide back leaves as
   * it always did. The current history state is spread in, because the App
   * Router keeps its own tree in it and an entry without that tree makes it
   * reload on the way back.
   */
  const goTo = useCallback(
    (to: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, to));
      if (clamped === index) return;
      try {
        window.history.pushState({ ...(window.history.state ?? {}), nfGsSlide: clamped }, "");
      } catch {
        /* A sandbox that refuses history still moves the slide. */
      }
      setIndex(clamped);
      announceSlide(clamped);
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

  /* A member who starts at the question was shown the slides already, maybe
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

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  /* Leaving first run for the app is a full navigation, replacing this entry.
     Found in the final pass: a client-side replace to `/home` that the proxy
     answers with a redirect (a session that has lapsed, or the fixture
     harness signed out) hung mid-transition with the button busy. A document
     load follows any redirect, and the slide entries this screen pushed are
     not left behind in the back stack of the app. */
  const leave = (path: string) => {
    window.location.replace(path);
  };

  /* A member finishing the slides. */
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
      leave(next ?? "/home");
    });
  };

  const slide = slides[index] ?? slides[0]!;
  const onLast = index === lastIndex;

  /*
   * The two doors, keeping whatever the person was on their way to.
   *
   * CREATE ACCOUNT USED TO DROP IT (audit UX-02, R16). With `next` set to the
   * wall's `/sign-in?next=/search...`, the sign-in door kept it and the
   * sign-up door fell back to a bare `/sign-up`, so a stranger who chose to
   * make an account instead of signing in lost the thing that was shared with
   * them. Both doors now carry the destination: the door they came through
   * keeps its whole address (its notice included), and the other door is
   * built from the destination underneath it.
   */
  const destinationQuery = arrival ? `?next=${encodeURIComponent(arrival.destination)}` : "";
  const signUpHref =
    next && /^\/sign-up(?:[/?#]|$)/.test(next) ? next : `/sign-up${destinationQuery}`;
  const signInHref =
    next && /^\/sign-in(?:[/?#]|$)/.test(next) ? next : `/sign-in${destinationQuery}`;
  /* The primary door is the one the heading names. Without a heading, the
     one they came through. */
  const signInFirst = wall ? wall.primary === "sign-in" : signInHref !== "/sign-in";

  const lockup = (
    <span className="nf-gs-lockup" role="img" aria-label="Vallo">
      <LogoMark size={44} priority />
      <Image
        src="/brand/vallo-wordmark.png"
        alt=""
        width={758}
        height={167}
        priority
        className="nf-gs-lockup__word"
      />
    </span>
  );

  if (beat === "question") {
    return (
      <div className="nf-gs-col" data-testid="first-run">
        {lockup}
        <div className="nf-gs-question">
          <h1 className="nf-gs-title nf-gs-title--question">{t.interests.question}</h1>
          <p className="nf-gs-sub">
            {t.interests.screenSubtitle}. {t.interests.note}
          </p>
          <p className="nf-gs-note">{t.welcomeCards.three.body}</p>
          <div className="nf-gs-question__choices">
            <InterestChoices initial={interests} t={t} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nf-gs-col" data-testid="first-run">
      {/* Back, on slides two to four only: the render draws none on the
          first slide, where back leaves first run the way it came. It steps
          through the same history the hardware button does. */}
      {index !== initialIndex && (
        <button
          type="button"
          className="nf-gs-back"
          aria-label={t.common.back}
          data-nav-back=""
          data-testid="welcome-back"
          onClick={() => window.history.back()}
        >
          <UiIcon name="arrow-left" size={20} />
        </button>
      )}
      {lockup}

      <section
        className="nf-gs-carousel"
        aria-roledescription="carousel"
        aria-label={f.carousel}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div
          key={slide.key}
          className="nf-gs-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={w.step.replace("{n}", String(index + 1)).replace("{total}", String(total))}
          data-slide={slide.key}
        >
          <h1 className="nf-gs-title">
            <span className="nf-gs-title__a">{slide.titleA}</span>
            <span className="nf-gs-title__b">{slide.titleB}</span>
          </h1>
          <p className="nf-gs-sub">{slide.body}</p>
          <WelcomeScene
            left={slide.art.left}
            right={slide.art.right}
            centre={slide.art.centre}
            label={slide.art.label}
            renderObjects={slide.key === "worlds" || slide.key === "member"}
            priority={index === 0}
          />
        </div>
      </section>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announce}
      </p>

      <div className="nf-gs-dots" role="group" aria-label={t.welcomeCards.label}>
        {slides.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className="nf-gs-dot"
            aria-label={w.step.replace("{n}", String(i + 1)).replace("{total}", String(total))}
            aria-current={i === index ? "step" : undefined}
            onClick={() => goTo(i)}
            data-testid={`welcome-dot-${i + 1}`}
          >
            <span />
          </button>
        ))}
      </div>

      <div className="nf-gs-actions">
        {!onLast ? (
          <Button
            variant="primary"
            size="lg"
            className="nf-gs-btn"
            onClick={() => goTo(index + 1)}
            data-testid={index === 0 ? "welcome-get-started" : "welcome-next"}
          >
            <span>{index === 0 ? w.getStarted : f.next}</span>
            <UiIcon name="arrow-right" size={20} />
          </Button>
        ) : guest ? (
          <div className="nf-gs-doors">
            {signInFirst ? (
              <>
                <ButtonLink variant="primary" size="lg" href={signInHref} onClick={door(signInHref)} className="nf-gs-btn" data-testid="welcome-sign-in">
                  {f.choice.signIn}
                </ButtonLink>
                <ButtonLink variant="secondary" size="lg" href={signUpHref} onClick={door(signUpHref)} className="nf-gs-btn" data-testid="welcome-create">
                  {f.choice.create}
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink variant="secondary" size="lg" href={signInHref} onClick={door(signInHref)} className="nf-gs-btn" data-testid="welcome-sign-in">
                  {f.choice.signIn}
                </ButtonLink>
                <ButtonLink variant="primary" size="lg" href={signUpHref} onClick={door(signUpHref)} className="nf-gs-btn" data-testid="welcome-create">
                  {f.choice.create}
                </ButtonLink>
              </>
            )}
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="nf-gs-btn"
            onClick={onDone}
            loading={pending}
            data-testid="welcome-continue"
          >
            <span>{f.member.continue}</span>
            <UiIcon name="arrow-right" size={20} />
          </Button>
        )}

        {onLast ? null : (
          <button
            type="button"
            className="nf-gs-skip"
            onClick={skip}
            disabled={pending}
            data-testid="welcome-skip-all"
          >
            {t.welcomeCards.skip}
          </button>
        )}

        {error && (
          <p role="alert" className="nf-gs-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
