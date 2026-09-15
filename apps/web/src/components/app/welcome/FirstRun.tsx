import type { Dictionary } from "@naijafinds/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { InterestChoices } from "./InterestChoices";
import type { ComponentProps } from "react";

/**
 * First run: one question, and one warning.
 *
 * IT WAS TWO BEATS AND IS NOW ONE. A three-card carousel introduced the
 * platform, then the question asked what the reader came for. The argument for
 * splitting them was sound - one is us talking and one is them answering, and a
 * form under a pitch makes the pitch feel like a toll - and it was an argument
 * about the wrong thing. The pitch itself had no business being here. Everybody
 * who reaches this screen has just completed a four-group sign-up form; they
 * decided several minutes ago.
 *
 * This is also no longer a client component, because with the carousel gone
 * there is no state left to hold.
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
  showCards,
}: {
  t: Dictionary;
  /* The typed market keys, not loose strings: the choices component owns the
     union and this is only carrying it through. */
  interests: ComponentProps<typeof InterestChoices>["initial"];
  /* False for anybody who has already been shown them. A returning sign-in
     goes straight to the question, or past this screen entirely. */
  showCards: boolean;
}) {
  /*
   * THE THREE-CARD CAROUSEL IS GONE, AT THE OWNER'S INSTRUCTION.
   *
   * It was a full-bleed pitch shown to somebody who had just finished a
   * four-group sign-up form. They have already decided; a carousel explaining
   * what Vallo is arrives one screen too late to persuade anybody and one
   * screen too early to be useful, and it stood between finishing sign-up and
   * using the product.
   *
   * The copy was also out of date in the way the landing page was, and for the
   * same reason: card one offered "hotels for the weekend, restaurants and
   * experiences", three of which this platform no longer sells.
   *
   * ONE THING FROM IT SURVIVES, AND IT HAD TO. Card three carried the only
   * safety sentence in the whole first run: never send money to anybody outside
   * Vallo. That is the single most valuable thing we say to a new account, it
   * is what the note above this component argued was worth showing twice, and
   * deleting it with the carousel would have been the cosmetic change quietly
   * removing the protective one. It sits under the question instead, where the
   * person still reads it and nothing has to be swiped to reach it.
   *
   * `showCards` stays on the props for now rather than being threaded out of
   * the page and the interests query in the same change; it is unused here and
   * the call site passes it harmlessly.
   */
  void showCards;

  return (
    <div className="relative z-10 w-full max-w-[32rem]">
      <div className="nf-rise flex flex-col items-center text-center">
        <LogoMark size={40} title="Vallo" />
        <h1 className="nf-h2 mt-4">{t.interests.question}</h1>
        <p className="mt-2 max-w-[26rem] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.interests.screenSubtitle}. {t.interests.note}
        </p>
        {/* The one line rescued from the carousel. See the note above. */}
        <p className="mt-3 max-w-[26rem] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          {t.welcomeCards.three.body}
        </p>
      </div>

      <div className="nf-rise mt-7" style={{ animationDelay: "90ms" }}>
        <InterestChoices initial={interests} t={t} />
      </div>
    </div>
  );
}
