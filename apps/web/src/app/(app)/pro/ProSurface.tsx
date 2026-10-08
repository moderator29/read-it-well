import "./pro-page.css";
import { intlTag, type Locale } from "@vallo/i18n/core";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusPill } from "@/components/ui/StatusPill";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { SubscriptionView, SubscriptionsCopy } from "@/lib/subscriptions/state";
import { ManagePlan } from "./ManagePlan";
import { ProExplainer } from "./ProExplainer";
import { PlanPicker } from "./PlanPicker";
import { PRO_COPY } from "./pro-copy";
import type { PaidPlan, ProPlanState } from "./pro-state";

/**
 * THE /pro SURFACE (P6, 7 October 2026), to the governing level (D74):
 *
 *   1. The explainer: a device frame with a smoked-glass fragment of the real
 *      product breaking out of it (GOVERNING-plasma-withdraw-anytime,
 *      reference 9), then the headline with its last word in brand blue.
 *   2. Where the member stands: their plan, read from the database; a plan
 *      held through a subscription shows its status, the trial's end or the
 *      next charge, and the way to cancel (`ManagePlan`).
 *   3. The plan page (GOVERNING-plasma-tier-detail-core): pill, metal cards
 *      fanned in depth, name, who it is for, the monthly price and the free
 *      trial read from the plan rows (D83), three stats, what it includes,
 *      then the purchase: the terms, the free trial, subscribing through
 *      Paystack (`PlanCheckout`).
 *   4. How Pro will work: three promises in the grouped list.
 *
 * Server-safe apart from its client islands (the plan page's choice, the
 * purchase, managing a plan). Every figure on it comes from the plan rows and
 * the member's subscription rows; no invented figure anywhere on it.
 */
export function ProSurface({
  state,
  plans,
  trialDays,
  switchReady = false,
  locale,
  signInHref,
  subscriptions = null,
  trialOpen = false,
  payOpen = false,
  copy,
}: {
  state: ProPlanState;
  /** The paid plans the database describes (D83), cheapest first. */
  plans: PaidPlan[];
  /** The free trial in days, from the settings row; null when unread. */
  trialDays: number | null;
  /** The entitlement check agrees a switch is drawn for this member. */
  switchReady?: boolean;
  locale: Locale;
  signInHref: string;
  /** The member's subscription rows, read; null when signed out or unread. */
  subscriptions?: SubscriptionView | null;
  /** The `subscriptions_checkout` switch is on (a trial can start). */
  trialOpen?: boolean;
  /** The switch is on and Paystack can take a payment here. */
  payOpen?: boolean;
  copy: SubscriptionsCopy;
}) {
  const c = PRO_COPY;
  const live = subscriptions?.live ?? null;
  return (
    <div className="nf-pro mx-auto max-w-2xl" data-testid="pro-page">
      <PageHeader title={c.title} fallback="/settings" />

      <section className="nf-pro__hero" aria-labelledby="pro-hero-title">
        <ProExplainer />
        <Reveal stagger className="nf-pro__intro">
          <h2 id="pro-hero-title" className="nf-pro__headline">
            {c.hero.lead} <span className="nf-pro__headline-last">{c.hero.last}</span>
          </h2>
          <p className="nf-pro__body">{c.hero.body}</p>
        </Reveal>
      </section>

      <Reveal className="nf-pro__stack">
        {live && state.kind !== "signed-out" ? (
          <ManagePlan live={live} locale={locale} copy={copy} label={c.plan.label} />
        ) : (
          <PlanCard state={state} switchReady={switchReady} locale={locale} signInHref={signInHref} />
        )}

        <section className="nf-pro-wall" aria-label={c.detail.pickLabel} data-testid="pro-wall">
          <PlanPicker
            plans={plans}
            trialDays={trialDays}
            locale={locale}
            heldName={live ? live.planName : state.kind === "held" ? state.planName : null}
            signedIn={state.kind !== "signed-out"}
            signInHref={signInHref}
            subscriptions={subscriptions}
            trialOpen={trialOpen}
            payOpen={payOpen}
            copy={copy}
          />
        </section>

        <ListGroup label={c.promises.label} className="nf-pro__promises">
          {c.promises.rows.map((row) => (
            <ListRow
              key={row.title}
              leading={
                <IconPlate size="sm" tone="neutral">
                  <UiIcon name={row.icon} size={ICON_PLATE_GLYPH.sm} />
                </IconPlate>
              }
              title={row.title}
              sub={row.sub}
            />
          ))}
        </ListGroup>
      </Reveal>
    </div>
  );
}

function PlanCard({
  state,
  switchReady,
  locale,
  signInHref,
}: {
  state: ProPlanState;
  switchReady: boolean;
  locale: Locale;
  signInHref: string;
}) {
  const c = PRO_COPY.plan;
  if (state.kind === "signed-out") {
    return (
      <div className="nf-pro-mine" data-state="signed-out" data-testid="pro-plan-state">
        <span className="nf-pro-mine__label">{c.label}</span>
        <p className="nf-pro-mine__name nf-pro-mine__name--quiet">{c.signedOutTitle}</p>
        <p className="nf-pro-mine__body">{c.signedOutBody}</p>
        <ButtonLink href={signInHref} variant="secondary" full>
          {c.signIn}
        </ButtonLink>
      </div>
    );
  }
  if (state.kind === "unknown") {
    return (
      <div className="nf-pro-mine" data-state="unknown" data-testid="pro-plan-state" role="status">
        <span className="nf-pro-mine__label">{c.label}</span>
        <p className="nf-pro-mine__name nf-pro-mine__name--quiet">{c.unknownTitle}</p>
        <p className="nf-pro-mine__body">{c.unknownBody}</p>
        <ButtonLink href="/pro" variant="secondary" full>
          {c.retry}
        </ButtonLink>
      </div>
    );
  }
  if (state.kind === "held") {
    const until = state.until
      ? c.heldUntil.replace(
          "{date}",
          new Intl.DateTimeFormat(intlTag[locale], {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "Africa/Lagos",
          }).format(new Date(state.until)),
        )
      : c.heldOpen;
    return (
      <div className="nf-pro-mine" data-state="held" data-testid="pro-plan-state">
        <span className="nf-pro-mine__label">{c.label}</span>
        <div className="nf-pro-mine__row">
          <p className="nf-pro-mine__name">{state.planName}</p>
          <StatusPill tone="success">{c.current}</StatusPill>
        </div>
        <p className="nf-pro-mine__body nf-numeric">{until}</p>
        <p className="nf-pro-mine__body">{switchReady ? c.heldBody : c.heldSoon}</p>
      </div>
    );
  }
  return (
    <div className="nf-pro-mine" data-state="free" data-testid="pro-plan-state">
      <span className="nf-pro-mine__label">{c.label}</span>
      <div className="nf-pro-mine__row">
        <p className="nf-pro-mine__name">{state.planName}</p>
        <StatusPill tone="brand">{c.current}</StatusPill>
      </div>
      <p className="nf-pro-mine__body">{c.freeBody}</p>
    </div>
  );
}
