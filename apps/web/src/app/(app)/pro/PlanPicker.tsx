"use client";

import { useState } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { Segmented } from "@/components/ui/Segmented";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { planOfferFor, type SubscriptionView, type SubscriptionsCopy } from "@/lib/subscriptions/state";
import { PlanCheckout } from "./PlanCheckout";
import { PRO_COPY, PRO_PLAN_WORDS, type ProBenefit } from "./pro-copy";
import type { PaidPlan } from "./pro-state";

/** What a plan includes, in the page's words: its monthly quotas, then its perks. */
export function planBenefits(plan: PaidPlan): ProBenefit[] {
  const quotas = plan.quotas.map((q) => {
    const words = PRO_COPY.quotas[q.key];
    return {
      claim: (q.count === 1 ? words.one : words.other).replace("{count}", String(q.count)),
      reason: words.reason,
      icon: words.icon,
    };
  });
  return [...quotas, ...plan.perks.map((k) => PRO_COPY.perks[k])];
}

/**
 * THE PLAN PAGE (D74: GOVERNING-plasma-tier-detail-core for the page,
 * GOVERNING-plasma-tiers-cards for the cards), drawing the plans the database
 * describes (D83: Vallo Pro and Vallo Business).
 *
 * A segmented plan pill at the top. Under it the plans as brushed platinum
 * cards fanned in depth: the chosen one floats in front, the other steps back.
 * Then the plan's name, who it is for, its monthly price and the free trial
 * (both read from the rows, never written here), a three-stat strip, what it
 * includes (the monthly quotas from its grants, then its perks), and
 * "Continue with <plan>".
 *
 * THE PURCHASE IS UNDER IT (`PlanCheckout`), offering what fits the member
 * for the chosen plan (`planOfferFor`): sign in, the free trial (no card,
 * once ever), subscribing through Paystack, or a plain line when they already
 * hold a plan or subscriptions are closed. The price a month, the trial's
 * length, what the plan includes, that it renews monthly and how to cancel
 * are all on this page before anything is charged.
 *
 * GOLD is the higher metal and the payoff, never decoration: a card turns gold
 * only for the plan the member holds (`heldName`).
 */
export function PlanPicker({
  plans,
  trialDays,
  locale,
  heldName,
  signedIn,
  signInHref,
  subscriptions,
  trialOpen,
  payOpen,
  copy,
}: {
  plans: PaidPlan[];
  /** The free trial in days, from the settings row; null when it could not be read. */
  trialDays: number | null;
  locale: Locale;
  heldName?: string | null;
  signedIn: boolean;
  signInHref: string;
  /** The member's subscriptions; null when signed out or the read failed. */
  subscriptions: SubscriptionView | null;
  /** The `subscriptions_checkout` switch is on. */
  trialOpen: boolean;
  /** The switch is on and Paystack can take a payment here. */
  payOpen: boolean;
  copy: SubscriptionsCopy;
}) {
  const [chosen, setChosen] = useState<string>(plans[0]?.key ?? "");
  const c = PRO_COPY.detail;

  if (plans.length === 0) {
    return (
      <p className="nf-pro__none" role="status" data-testid="pro-plans-none">
        {c.none}
      </p>
    );
  }

  const at = Math.max(
    0,
    plans.findIndex((p) => p.key === chosen),
  );
  const plan = plans[at]!;
  const n = plans.length;
  const words = PRO_PLAN_WORDS[plan.key];
  const benefits = planBenefits(plan);
  const price = c.price.replace("{price}", formatMoney(plan.priceMinor, locale));

  return (
    <div className="nf-pro-plan" data-testid="pro-plan-detail">
      {n > 1 ? (
        <Segmented<string>
          label={c.pickLabel}
          semantics="tabs"
          shape="pill"
          size="sm"
          full
          options={plans.map((p) => ({ value: p.key, label: PRO_PLAN_WORDS[p.key]?.short ?? p.name }))}
          value={plan.key}
          onChange={setChosen}
          className="nf-pro-plan__pick"
        />
      ) : null}

      {/* The fan is the picture of the choice; the pill above is the
          control, so the cards are hidden from a screen reader. */}
      <div className="nf-pro-fan" aria-hidden="true">
        <span className="nf-pro-fan__fog" />
        {plans.map((p, i) => {
          const depth = (i - at + n) % n;
          const gold = heldName != null && heldName === p.name;
          return (
            <span
              key={p.key}
              className="nf-pro-metal"
              data-depth={depth}
              data-metal={gold ? "gold" : "platinum"}
              data-testid={`pro-plan-${p.key}`}
            >
              <span className="nf-pro-metal__sheen" />
              <span className="nf-pro-metal__top">
                <span className="nf-pro-metal__brand">
                  <LogoMark size={18} />
                  Vallo
                </span>
                {PRO_PLAN_WORDS[p.key]?.tag ? <span className="nf-pro-metal__tier">{PRO_PLAN_WORDS[p.key]!.tag}</span> : null}
              </span>
              <span className="nf-pro-metal__foot">
                <span className="nf-pro-metal__name">{p.name}</span>
              </span>
            </span>
          );
        })}
      </div>

      <div className="nf-pro-plan__head" aria-live="polite">
        <p className="nf-pro-plan__name">
          <LogoMark size={22} />
          {plan.name}
        </p>
        {words ? <p className="nf-pro-plan__promise">{words.line}</p> : null}
        <p className="nf-pro-plan__price nf-numeric" data-testid="pro-plan-price">
          {price}
        </p>
        {trialDays != null ? (
          <p className="nf-pro-plan__trial" data-testid="pro-plan-trial">
            {c.trial.replace("{days}", String(trialDays))}
          </p>
        ) : null}
      </div>

      <dl className="nf-pro-plan__stats">
        <div className="nf-pro-plan__stat">
          <dt>{c.stats.included}</dt>
          <dd className="nf-numeric">{benefits.length}</dd>
        </div>
        <div className="nf-pro-plan__stat">
          <dt>{c.stats.price}</dt>
          <dd className="nf-numeric">{formatMoney(plan.priceMinor, locale)}</dd>
        </div>
        {trialDays != null ? (
          <div className="nf-pro-plan__stat">
            <dt>{c.stats.trial}</dt>
            <dd className="nf-numeric">{c.stats.trialValue.replace("{days}", String(trialDays))}</dd>
          </div>
        ) : null}
      </dl>

      <ul className="nf-pro-plan__benefits">
        {benefits.map((b) => (
          <li key={b.claim} className="nf-pro-plan__benefit">
            <span className="nf-pro-plan__benefit-text">
              <span className="nf-pro-plan__claim">{b.claim}</span>
              <span className="nf-pro-plan__reason">{b.reason}</span>
            </span>
            <span className="nf-pro-plan__badge" aria-hidden="true">
              <UiIcon name={b.icon} size={18} />
            </span>
          </li>
        ))}
      </ul>

      <div className="nf-pro-plan__go">
        <PlanCheckout
          key={plan.key}
          plan={plan}
          offer={planOfferFor({ planKey: plan.key, signedIn, trialOpen, payOpen, trialDays, view: subscriptions })}
          trialDays={trialDays}
          locale={locale}
          copy={copy}
          signInHref={signInHref}
        />
      </div>
    </div>
  );
}
