import "./pro-page.css";
import { intlTag, type Locale } from "@vallo/i18n/core";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";
import { StatusPill } from "@/components/ui/StatusPill";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ProExplainer } from "./ProExplainer";
import { PlanPicker } from "./PlanPicker";
import { PRO_COPY } from "./pro-copy";
import type { ProPlanState } from "./pro-state";

/**
 * THE /pro SURFACE (P6, 7 October 2026), to the governing level (D74):
 *
 *   1. The explainer: a device frame with a smoked-glass fragment of the real
 *      product breaking out of it (GOVERNING-plasma-withdraw-anytime,
 *      reference 9), then the headline with its last word in brand blue.
 *   2. Where the member stands: their plan, read from the database.
 *   3. The plan page (GOVERNING-plasma-tier-detail-core): pill, metal cards
 *      fanned in depth, name, promise, the honest price line, three stats,
 *      benefit rows, "Continue with <plan>" opening the one plain gate.
 *   4. How Pro will work: three promises in the grouped list.
 *
 * Server-safe apart from its two client islands (the plan page's choice and
 * gate). No price, no checkout, no invented figure anywhere on it.
 */
export function ProSurface({
  state,
  offered,
  switchReady = false,
  locale,
  signInHref,
}: {
  state: ProPlanState;
  /** Plans the database offers by name today (none on 7 October). */
  offered: string[];
  /** The entitlement check agrees a switch is drawn for this member. */
  switchReady?: boolean;
  locale: Locale;
  signInHref: string;
}) {
  const c = PRO_COPY;
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
        <PlanCard state={state} switchReady={switchReady} locale={locale} signInHref={signInHref} />

        <section className="nf-pro-wall" aria-label={c.detail.pickLabel} data-testid="pro-wall">
          {offered.length > 0 ? (
            <p className="nf-pro__offered" data-testid="pro-offered">
              <span className="nf-pro__offered-label">{c.detail.offeredLabel}</span> {offered.join(", ")}.{" "}
              {c.detail.offeredNote}
            </p>
          ) : null}
          <PlanPicker
            heldName={state.kind === "held" ? state.planName : null}
            signedIn={state.kind !== "signed-out"}
            signInHref={signInHref}
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
