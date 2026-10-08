"use client";

import { useState } from "react";
import { formatMoney, type Locale } from "@vallo/i18n/core";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
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
 * "CONTINUE" IS NEVER A DEAD BUTTON AND NEVER A CHECKOUT. No subscription
 * checkout and no way to start a trial exist yet, so it opens a single plain
 * sheet saying the plan is not on sale yet, and offers the one real thing to
 * do now (choose what reaches you, or sign in). When paying opens, this sheet
 * becomes the page that states the price before anything is charged.
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
}: {
  plans: PaidPlan[];
  /** The free trial in days, from the settings row; null when it could not be read. */
  trialDays: number | null;
  locale: Locale;
  heldName?: string | null;
  signedIn: boolean;
  signInHref: string;
}) {
  const [chosen, setChosen] = useState<string>(plans[0]?.key ?? "");
  const [gate, setGate] = useState(false);
  const c = PRO_COPY.detail;
  const g = PRO_COPY.gate;

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
        <Button variant="primary" full className="nf-btn--reflect" onClick={() => setGate(true)} data-testid="pro-continue">
          {c.continue.replace("{plan}", plan.name)}
        </Button>
        <p className="nf-pro-plan__fine">{c.fine}</p>
      </div>

      <Sheet open={gate} onOpenChange={setGate} title={g.title.replace("{plan}", plan.name)} closeLabel={g.close} testId="pro-gate">
        <div className="nf-pro-gate">
          <p className="nf-pro-gate__body">{g.body}</p>
          {signedIn ? (
            <ButtonLink href="/settings/notifications" variant="primary" full>
              {g.settings}
            </ButtonLink>
          ) : (
            <ButtonLink href={signInHref} variant="primary" full>
              {g.signIn}
            </ButtonLink>
          )}
        </div>
      </Sheet>
    </div>
  );
}
