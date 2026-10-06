"use client";

import "./plans-premium.css";
import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { initialPlan, termsComplete, type PlanTerms } from "./plan-rules";

/**
 * A PLAN SCREEN, IN THE HONEST ANATOMY (north star 14.3 with D21; references
 * 7126 and 7121 for the two plans, 7050 for the tier template, 7034 for the
 * trial). In order, and nothing else:
 *
 *   1. the artefact (`Credential` or `CredentialFan`, 14.4), passed in
 *   2. the promise, one line
 *   3. three to five benefit rows, each a line glyph and a concrete benefit
 *   4. the plans: two cards, monthly and annual, the price large and tabular,
 *      the annual saving as a real figure only when the server supplies it
 *   5. the trial timeline, where there is a trial (passed in, 15.6)
 *   6. ONE primary action, with what happens next directly above it
 *
 * THE FOOT IS STICKY AND CARRIES THE TERMS ABOVE THE BUTTON, which is how D21's
 * "visible on the same screen at legible size without scrolling past the
 * action" is met by layout rather than by hope: whatever the scroll, the four
 * lines (charged today, the charge date, the renewal, the cancel path) sit
 * immediately above the button at the body-small size, never caption. And a
 * plan is preselected only when all four exist (`initialPlan`).
 *
 * THE TERMS BELONG TO A PLAN. Monthly and annual charge on different dates and
 * renew differently, so each `PlanOption` carries its own four sentences and
 * the foot shows the CHOSEN plan's, changing as the choice does. A plan with
 * no complete set has no foot and no action when it is chosen, and is never
 * preselected; nothing here fills a gap from another plan's sentences or
 * composes one, so no price or period is ever invented.
 *
 * WHAT THIS COMPONENT CANNOT DRAW, BY CONSTRUCTION: a countdown, a "% off
 * forever", a strike-through anchor price, confetti, a padlock. There is no
 * prop for any of them. The plan cards are a radio group, never a toggle that
 * hides the other price.
 *
 * No plan screen exists in the product today (searched 6 October: no plan,
 * paywall or subscription route), and no plan table exists (W7-R4), so this
 * is mounted only in the component gallery until Session 2 supplies plans,
 * prices and the money sentences (W7-R5). Every figure arrives from the
 * caller in kobo and is printed through `formatMoney`; null prints nothing.
 */
export type PlanOption = {
  id: string;
  period: "monthly" | "annual";
  /** The price per period, in kobo, from the server. Null when it has none. */
  priceMinor: number | null;
  /** The annual plan's real saving over twelve months of monthly, in kobo. Shown only when present. */
  savingMinor?: number | null;
  /** This plan's four money sentences, from `lib/money/copy.ts`. Missing lines mean no foot and no preselection for it. */
  terms?: Partial<PlanTerms>;
};

export type Benefit = { icon: UiIconName; text: string };

export function PlanPaywall({
  artefact,
  promise,
  benefits,
  plans,
  preselectedId,
  trial,
  locale,
  copy,
  action,
}: {
  artefact: ReactNode;
  promise: string;
  benefits: readonly Benefit[];
  plans: readonly PlanOption[];
  /** The recommended plan. Honoured only when that plan's four terms lines exist (D21). */
  preselectedId?: string | null;
  /** The `TrialTimeline`, where there is a trial. */
  trial?: ReactNode;
  locale: Locale;
  copy: {
    choose: string;
    monthly: string;
    annual: string;
    perMonth: string;
    perYear: string;
    recommended: string;
    saving: string;
    benefits: string;
  };
  /** The one primary action, given the chosen plan (null until one is chosen). */
  action: (planId: string | null) => ReactNode;
}) {
  const ids = plans.map((plan) => plan.id);
  const termsOf = (id: string | null | undefined) => plans.find((plan) => plan.id === id)?.terms;
  const recommended = initialPlan(preselectedId, ids, termsOf(preselectedId));
  const [chosen, setChosen] = useState<string | null>(recommended);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    e.preventDefault();
    const index = Math.max(0, ids.indexOf(chosen ?? ""));
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
    const to = ids[(index + step + ids.length) % ids.length] ?? null;
    setChosen(to);
    const el = e.currentTarget.querySelector<HTMLElement>(`[data-plan="${to}"]`);
    el?.focus();
  };

  /* The foot speaks for the plan that is chosen, in that plan's own words. */
  const chosenTerms = termsOf(chosen);
  const lines = termsComplete(chosenTerms) ? chosenTerms : null;

  return (
    <div className="nf-paywall">
      <div className="nf-paywall__body">
        <div className="nf-paywall__artefact">{artefact}</div>
        <h1 className="nf-paywall__promise">{promise}</h1>

        <section aria-label={copy.benefits}>
          <ul className="nf-paywall__benefits">
            {benefits.map((benefit) => (
              <li key={benefit.text} className="nf-paywall__benefit">
                <span className="nf-paywall__benefit-plate" aria-hidden="true">
                  <UiIcon name={benefit.icon} size={20} />
                </span>
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="nf-paywall__plans" role="radiogroup" aria-label={copy.choose} onKeyDown={onKeyDown}>
          {plans.map((plan) => {
            const selected = plan.id === chosen;
            const focusable = selected || (chosen === null && plan.id === ids[0]);
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={focusable ? 0 : -1}
                data-plan={plan.id}
                className="nf-paywall__plan"
                onClick={() => setChosen(plan.id)}
              >
                <span className="nf-paywall__plan-head">
                  <span className="nf-paywall__plan-name">{plan.period === "annual" ? copy.annual : copy.monthly}</span>
                  {plan.id === recommended ? <span className="nf-paywall__flag">{copy.recommended}</span> : null}
                </span>
                {plan.priceMinor !== null ? (
                  <span className="nf-paywall__price nf-numeric">
                    {formatMoney(plan.priceMinor, locale)}
                    <span className="nf-paywall__per"> {plan.period === "annual" ? copy.perYear : copy.perMonth}</span>
                  </span>
                ) : null}
                {plan.period === "annual" && plan.savingMinor ? (
                  <span className="nf-paywall__saving nf-numeric">
                    {copy.saving.replace("{amount}", formatMoney(plan.savingMinor, locale))}
                  </span>
                ) : null}
                <span className="nf-paywall__radio" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        {trial}
      </div>

      {/* NO TERMS, NO ACTION. A plan that cannot say what it charges, when,
          how it renews and how to cancel has nothing honest to sell, so the
          foot is not drawn at all until the chosen plan's four sentences
          exist (and with no plan chosen there are none to show). */}
      {lines ? (
        <div className="nf-paywall__foot">
          <ul className="nf-paywall__terms">
            <li>{lines.chargeToday}</li>
            <li>{lines.chargeOn}</li>
            <li>{lines.renewal}</li>
            <li>{lines.cancel}</li>
          </ul>
          {action(chosen)}
        </div>
      ) : null}
    </div>
  );
}
