"use client";

import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Sheet } from "@/components/ui/Sheet";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { PRO_COPY, PRO_PLAN_CARDS, type ProPlanCard } from "./pro-copy";

type PlanKey = ProPlanCard["key"];

/**
 * THE PLAN PAGE (D74: GOVERNING-plasma-tier-detail-core for the page,
 * GOVERNING-plasma-tiers-cards for the cards).
 *
 * A segmented plan pill at the top. Under it the plans as brushed platinum
 * cards fanned in depth: the chosen one floats in front with a long soft
 * shadow over a tinted fog, the others step back to the left, lower, smaller
 * and turned further; tapping one brings it forward. Then the plan's name and
 * mark, its two-line promise, the price line in grey (the honest "coming"),
 * a three-stat strip split by hairlines, the benefit rows (a bold claim, a
 * muted reason, a round badge), and "Continue with <plan>" as the one
 * reflecting capsule.
 *
 * "CONTINUE" IS NEVER A DEAD BUTTON AND NEVER A CHECKOUT. A.11's one gating
 * pattern: it opens a single plain sheet saying the plan is not on sale yet,
 * that its price and contents will be shown in full before anything is
 * charged, and offers the one real thing to do now (choose what reaches you,
 * or sign in). When a price exists this sheet becomes the gate that states it.
 *
 * GOLD is the higher metal and the payoff, never decoration: a card turns gold
 * only for the plan the member holds (`heldName`). Nobody holds one on
 * 7 October, so every card is platinum. Which plan is "the top plan" is the
 * founder's to name; until he does, gold means "yours".
 */
export function PlanPicker({
  heldName,
  signedIn,
  signInHref,
}: {
  heldName?: string | null;
  signedIn: boolean;
  signInHref: string;
}) {
  const [chosen, setChosen] = useState<PlanKey>(PRO_PLAN_CARDS[0]!.key);
  const [gate, setGate] = useState(false);
  const at = Math.max(
    0,
    PRO_PLAN_CARDS.findIndex((p) => p.key === chosen),
  );
  const plan = PRO_PLAN_CARDS[at]!;
  const n = PRO_PLAN_CARDS.length;
  const c = PRO_COPY.detail;
  const g = PRO_COPY.gate;

  return (
    <div className="nf-pro-plan" data-testid="pro-plan-detail">
      <Segmented<PlanKey>
        label={c.pickLabel}
        semantics="tabs"
        shape="pill"
        size="sm"
        full
        options={PRO_PLAN_CARDS.map((p) => ({ value: p.key, label: p.short }))}
        value={chosen}
        onChange={setChosen}
        className="nf-pro-plan__pick"
      />

      {/* The fan is the picture of the choice; the pill above is the
          control, so the cards are hidden from a screen reader. */}
      <div className="nf-pro-fan" aria-hidden="true">
        <span className="nf-pro-fan__fog" />
        {PRO_PLAN_CARDS.map((p, i) => {
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
                <span className="nf-pro-metal__tier">{c.tag}</span>
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
        <p className="nf-pro-plan__promise">{plan.line}</p>
        <p className="nf-pro-plan__price">{c.priceComing}</p>
      </div>

      <dl className="nf-pro-plan__stats">
        <div className="nf-pro-plan__stat">
          <dt>{c.stats.tools}</dt>
          <dd className="nf-numeric">{plan.benefits.length}</dd>
        </div>
        <div className="nf-pro-plan__stat">
          <dt>{c.stats.price}</dt>
          <dd className="nf-numeric">{c.stats.priceValue}</dd>
        </div>
        <div className="nf-pro-plan__stat">
          <dt>{c.stats.charged}</dt>
          <dd className="nf-numeric">{c.stats.chargedValue}</dd>
        </div>
      </dl>

      <ul className="nf-pro-plan__benefits">
        {plan.benefits.map((b) => (
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
