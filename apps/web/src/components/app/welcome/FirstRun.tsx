"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@vallo/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { markWelcomeSeen, skipInterests } from "@/lib/interests/actions";
import { InterestChoices } from "./InterestChoices";
import type { ComponentProps } from "react";

/**
 * First run, to its governing image (`docs/design/references/2A49E2F7`).
 *
 * TWO BEATS. The first is the render: "Two worlds. One platform.", the
 * Property and Stays glass cards with the coin between them, the beat dots,
 * Get Started and Skip. It is the one screen that explains the product's
 * whole shape, the two sides and the flip, to somebody who has just made an
 * account and has not yet seen the coin in the drawer. The second beat is
 * the one question the product can act on, which `InterestChoices` owns.
 *
 * WHAT EACH CONTROL WRITES, because a first-run screen with painted buttons
 * is a picture of onboarding:
 *
 *   Get Started   records that the opener has been seen (`markWelcomeSeen`,
 *                 quiet on failure, as its own note explains) and moves to
 *                 the question; or, when the question has already been
 *                 answered on another device, straight home.
 *   Skip          records the opener AND skips the question in one press
 *                 (`skipInterests` is the real skip, the one that never asks
 *                 again), then replaces the route with home so the screen
 *                 does not sit in the back stack.
 *   The dots      are the beats, and the second is a button only after the
 *                 first has been seen; the current one says so for a reader.
 *
 * NEVER THE "HOTEL" LETTERED ICON. The render bakes the word into the Stays
 * object; the Stays card carries the glass hotel object from the pack, which
 * says the same thing with no text in the pixels.
 *
 * Nothing here is saved about the beat itself beyond `welcomeSeen`. Somebody
 * who closes the tab on the first beat sees it once more, which is the right
 * side to err on: the opener costs four seconds and the question is the
 * thing that decides what they see first.
 */
export function FirstRun({
  t,
  interests,
  showCards,
  asked = false,
}: {
  t: Dictionary;
  /* The typed market keys, not loose strings: the choices component owns the
     union and this is only carrying it through. */
  interests: ComponentProps<typeof InterestChoices>["initial"];
  /* False for anybody who has already been shown the opener. A returning
     sign-in goes straight to the question, or past this screen entirely. */
  showCards: boolean;
  /* True when the question has been answered or skipped already, so Get
     Started has nowhere to go but home. */
  asked?: boolean;
}) {
  const router = useRouter();
  const w = t.welcomeCards.twoWorlds;
  const askQuestion = !asked;
  const [beat, setBeat] = useState<0 | 1>(showCards ? 0 : 1);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  const beats = askQuestion ? 2 : 1;

  const getStarted = () => {
    setError("");
    start(async () => {
      await markWelcomeSeen();
      if (askQuestion) {
        setBeat(1);
        return;
      }
      router.replace("/home");
      router.refresh();
    });
  };

  const skip = () => {
    setError("");
    start(async () => {
      const [, skipped] = await Promise.all([markWelcomeSeen(), skipInterests()]);
      if (!skipped.ok) {
        setError(skipped.error);
        return;
      }
      router.replace("/home");
      router.refresh();
    });
  };

  return (
    <div className="nf-welcome" data-testid="first-run">
      <span className="nf-welcome__lockup" aria-label="Vallo" role="img">
        <LogoMark size={36} />
        <Image
          src="/brand/vallo-wordmark.png"
          alt=""
          width={84}
          height={18}
          priority
          className="nf-welcome__word"
        />
      </span>

      {beat === 0 ? (
        <div key="worlds" className="nf-welcome__beat">
          <h1 className="nf-welcome__title">
            <span>{w.titleA}</span>
            <span className="nf-gradient-text">{w.titleB}</span>
          </h1>
          <p className="nf-welcome__body">{w.body}</p>

          {/* The two worlds, named as the render names them; the hints ride
              on the cards as their accessible description only, so the
              composition stays the render's. */}
          <div className="nf-welcome__stage" role="img" aria-label={`${w.property}: ${w.propertyHint}. ${w.stays}: ${w.staysHint}.`}>
            <div className="nf-welcome__world">
              <span className="nf-welcome__world-art">
                <BrandIcon name="modern-house" size={112} priority />
              </span>
              <span className="nf-welcome__world-name">{w.property}</span>
            </div>
            <div className="nf-welcome__coin">
              <LogoMark size={48} />
            </div>
            <div className="nf-welcome__world">
              <span className="nf-welcome__world-art">
                <BrandIcon name="hotel" size={112} priority />
              </span>
              <span className="nf-welcome__world-name">{w.stays}</span>
            </div>
          </div>
        </div>
      ) : (
        <div key="question" className="nf-welcome__beat">
          <div className="nf-rise text-center">
            <h1 className="nf-h2 mt-xl">{t.interests.question}</h1>
            <p className="nf-body-sm mx-auto mt-xs max-w-[26rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {t.interests.screenSubtitle}. {t.interests.note}
            </p>
            {/* The one safety sentence a new account must read, kept from the
                old three cards: never send money to anybody outside Vallo. */}
            <p className="nf-caption mx-auto mt-sm max-w-[26rem] leading-relaxed text-[var(--nf-content-muted)]">
              {t.welcomeCards.three.body}
            </p>
          </div>
          <div className="nf-welcome__question mt-lg">
            <InterestChoices initial={interests} t={t} />
          </div>
        </div>
      )}

      {beats > 1 && (
        <div className="nf-welcome__dots" role="list" aria-label={t.welcomeCards.label}>
          {Array.from({ length: beats }, (_, i) => {
            const current = i === beat;
            const label = w.step.replace("{n}", String(i + 1)).replace("{total}", String(beats));
            /* The first beat is always reachable again; the second only once
               the opener has been seen, which is what Get Started records. */
            const reachable = i === 0 || beat === 1;
            return (
              <button
                key={i}
                type="button"
                role="listitem"
                aria-label={label}
                aria-current={current ? "step" : undefined}
                disabled={!reachable || pending}
                onClick={() => setBeat(i === 0 ? 0 : 1)}
                className="nf-welcome__dot nf-tap"
              >
                <span />
              </button>
            );
          })}
        </div>
      )}

      {beat === 0 && (
        <>
          <Button
            type="button"
            variant="primary"
            size="lg"
            full
            loading={pending}
            onClick={getStarted}
            data-testid="welcome-get-started"
            className="nf-welcome__cta"
          >
            {w.getStarted}
            <UiIcon name="arrow-right" size={24} />
          </Button>
          <button
            type="button"
            onClick={skip}
            disabled={pending}
            data-testid="welcome-skip-all"
            className="nf-welcome__skip nf-tap"
          >
            {t.welcomeCards.skip}
          </button>
          {error && (
            <p role="alert" className="nf-welcome__error">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
