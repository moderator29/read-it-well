"use client";

import { useState } from "react";
import type { Dictionary } from "@naijafinds/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { InterestChoices } from "./InterestChoices";
import type { ComponentProps } from "react";
import { WelcomeCards } from "./WelcomeCards";

/**
 * First run, in two beats.
 *
 * The three cards say what this place is. The question after them asks what
 * the reader is here for. Two beats rather than one screen, because they are
 * different kinds of thing: one is us talking and one is them answering, and
 * putting a form under a pitch makes the pitch feel like a toll.
 *
 * Held in one client component rather than two routes on purpose. A second
 * route means a second gate, a second back button and a second way to arrive
 * out of order; this way the reader either has not seen the cards yet or has,
 * and the browser back button leaves first run entirely, which is what it
 * should do.
 *
 * Nothing is stored about the cards. Somebody who signs up, closes the tab
 * mid-way and comes back gets them once more, which is the right side to err
 * on: seeing three cards twice costs eight seconds, and never seeing the one
 * about not sending money off the platform costs a great deal more.
 */
export function FirstRun({
  t,
  interests,
}: {
  t: Dictionary;
  /* The typed market keys, not loose strings: the choices component owns the
     union and this is only carrying it through. */
  interests: ComponentProps<typeof InterestChoices>["initial"];
}) {
  const [read, setRead] = useState(false);

  if (!read) {
    return (
      <div className="relative z-10 flex w-full max-w-[32rem] flex-col items-center">
        <div className="nf-rise flex flex-col items-center text-center">
          <LogoMark size={40} title="RentMe" />
        </div>
        <div className="nf-rise mt-7 w-full" style={{ animationDelay: "90ms" }}>
          <WelcomeCards t={t} onDone={() => setRead(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 w-full max-w-[32rem]">
      <div className="nf-rise flex flex-col items-center text-center">
        <LogoMark size={40} title="RentMe" />
        <h1 className="nf-h2 mt-4">{t.interests.question}</h1>
        <p className="mt-2 max-w-[26rem] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.interests.screenSubtitle}. {t.interests.note}
        </p>
      </div>

      <div className="nf-rise mt-7" style={{ animationDelay: "90ms" }}>
        <InterestChoices initial={interests} t={t} />
      </div>
    </div>
  );
}
