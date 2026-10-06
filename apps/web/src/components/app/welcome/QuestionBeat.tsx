"use client";

import type { ComponentProps, CSSProperties } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { InterestChoices } from "./InterestChoices";
import { ArrivalAsks } from "./ArrivalAsks";
import { ObjectArt } from "@/components/auth/ObjectArt";
import { VectorMark, VectorWordmark } from "@/components/auth/VectorMark";

/**
 * A line that rises in a word at a time. The words stay ordinary inline spans
 * with their spaces, so the heading reads whole to a screen reader; the motion
 * is `.nf-gs-word` in welcome.css, with Calm, Off and reduced motion answered
 * there.
 */
function RiseWords({ text }: { text: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, i) => (
        <span key={`${i}-${word}`} className="nf-gs-word" style={{ "--nf-i": i } as CSSProperties}>
          {word}
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

/**
 * THE QUESTION BEAT: what a new member is asked once the account exists
 * (interests, and the arrival asks the one-screen sign-up moved here). It was
 * a branch inside `FirstRun.tsx`; it is its own component so the tour and the
 * question can each be designed on their own (W11, 6 October 2026).
 */
export function QuestionBeat({
  t,
  interests,
  asks,
}: {
  t: Dictionary;
  interests: ComponentProps<typeof InterestChoices>["initial"];
  asks: Omit<ComponentProps<typeof ArrivalAsks>, "t"> | null;
}) {
  return (
    <div className="nf-gs-col nf-gs-col--question" data-testid="first-run">
      {/* One soft wash behind the object, and nothing that loops (the orbs
          that bobbed here for as long as the page was open are gone). */}
      <div className="nf-gs-question__sky" aria-hidden="true" />
      <span className="nf-gs-lockup nf-gs-lockup--canvas nf-gs-qlockup" role="img" aria-label="Vallo">
        <VectorMark size={22} />
        <VectorWordmark height={11} />
      </span>
      <div className="nf-gs-question">
        <span className="nf-gs-question__object" aria-hidden="true">
          <ObjectArt name="house-heart" size={224} priority className="nf-gs-question__objectimg" />
        </span>
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
