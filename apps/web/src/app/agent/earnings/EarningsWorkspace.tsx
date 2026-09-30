import { formatDate, type Dictionary, type Locale } from "@vallo/i18n/core";
import { fill } from "../_copy";
import type { AgentEarnings } from "@/lib/agent/earnings-queries";
import { ButtonLink } from "@/components/ui/Button";
import { Amount, Figure } from "@/components/ui/Amount";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { IconPlate } from "@/components/ui/IconPlate";

/**
 * The host's earnings console: what has actually settled, read straight from
 * the ledger.
 *
 * A server component on purpose: nothing here mutates, so there is no reason
 * to ship it as client JavaScript. Every figure comes from AgentEarnings
 * exactly as earnings-queries.ts computed it. Vallo charges no listing fee
 * and this page never invents one; the only fee copy on the page is the
 * generic reconciliation note, which names the payment processor's cut, not
 * a platform cut.
 */

export type EarningsCopy = Dictionary["agentEarnings"];

function monthLabel(year: number, month: number, locale: Locale): string {
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  return formatDate(date, locale, { month: "long", year: "numeric" });
}

/**
 * A totals tile.
 *
 * The figure used to carry `truncate`, which on a phone clipped a real host's
 * lifetime share to "₦12,500,0…". A clipped number is not a shortened number,
 * it is a wrong one, so the figure is never truncated: the tile grows and the
 * digits stay whole.
 */
function Tile({
  icon,
  label,
  value,
}: {
  icon: UiIconName;
  label: string;
  value: React.ReactNode;
}) {
  return (
    /* The figure tile of reference 45 (section 17): label first with its
       lean glyph, then the big figure. The shared `.nf-kpi` material. */
    <div className="nf-kpi">
      <p className="nf-kpi__head">
        <UiIcon name={icon} size={16} className="nf-kpi__glyph" />
        <span className="nf-kpi__label">{label}</span>
      </p>
      <p className="nf-kpi__figure">{value}</p>
    </div>
  );
}

/** The size and weight every totals tile figure is set at. */
const TILE_FIGURE =
  "text-[length:var(--nf-text-h4)] font-semibold tracking-tight text-[var(--nf-content-primary)] sm:text-[length:var(--nf-text-h3)]";

export function EarningsWorkspace({
  t,
  earnings,
  locale,
}: {
  t: EarningsCopy;
  earnings: AgentEarnings;
  locale: Locale;
}) {
  if (!earnings.readable) {
    return (
      <p
        className="rounded-[var(--nf-container-radius)] p-md text-[length:var(--nf-text-body-sm)] font-medium leading-relaxed"
        style={{ background: "var(--nf-state-warning-surface)", color: "var(--nf-state-warning)" }}
        role="alert"
      >
        {t.unavailable}
      </p>
    );
  }

  if (earnings.months.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-md py-10 text-center sm:py-14">
        <IconPlate size="lg">
          <UiIcon name="bank" size={24} />
        </IconPlate>
        <h2 className="nf-h3">{t.emptyTitle}</h2>
        <p className="mx-auto max-w-[40ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.emptyBody}
        </p>
        <ButtonLink href="/agent/bookings" variant="primary">
          {t.emptyAction}
        </ButtonLink>
      </div>
    );
  }

  const thisMonthMinor = earnings.currentMonth?.agentShareMinor ?? 0;

  return (
    <div className="space-y-lg">
      <div className="nf-figure-tiles">
        <Tile
          icon="bank"
          label={t.totals.yourShare}
          value={
            <Amount
              minorUnits={earnings.totalAgentShareMinor}
              locale={locale}
              className={TILE_FIGURE}
            />
          }
        />
        <Tile
          icon="hand-coins"
          label={t.totals.guestsPaid}
          value={
            <Amount
              minorUnits={earnings.totalGrossMinor}
              locale={locale}
              className={TILE_FIGURE}
            />
          }
        />
        <Tile
          icon="calendar-check"
          label={t.totals.settledStays}
          value={
            <Figure value={earnings.settledStays} locale={locale} className={TILE_FIGURE} />
          }
        />
        <Tile
          icon="trending-up"
          label={t.totals.thisMonth}
          value={<Amount minorUnits={thisMonthMinor} locale={locale} className={TILE_FIGURE} />}
        />
      </div>

      <section className="nf-panel nf-panel--card block p-md sm:p-panel">
        <h2 className="nf-h3">{t.byMonth}</h2>

        {/* Phone: stacked cards, so nothing scrolls sideways. */}
        <ul className="mt-sm space-y-sm sm:hidden">
          {earnings.months.map((month) => (
            <li
              key={month.key}
              className="nf-panel nf-panel--card block p-sm"
            >
              <div className="flex items-baseline justify-between gap-md">
                <p className="text-[length:var(--nf-text-body-sm)] font-semibold">{monthLabel(month.year, month.month, locale)}</p>
                <Amount
                  minorUnits={month.agentShareMinor}
                  locale={locale}
                  className="text-[length:var(--nf-text-body-sm)] font-bold"
                />
              </div>
              <p className="mt-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                {month.stays === 1 ? t.staysOne : fill(t.stays, { count: month.stays })}
                {" · "}
                {t.monthGross} <Amount minorUnits={month.grossMinor} locale={locale} />
              </p>
            </li>
          ))}
        </ul>

        {/*
          Tablet and up: the real table.

          The phone rendering above is not a fallback, it is the small-screen
          branch: a four-column ledger on a 390px screen either scrolls
          sideways or shrinks its figures, and neither is how somebody checks
          what they were paid. Both branches read the same rows.

          Every numeric column is `align="end"`, which right-aligns AND sets
          the figures tabular - a money column that looks like it should line
          up by place value and does not is worse than one that never claimed
          to.
        */}
        <div className="mt-sm hidden sm:block">
          <Table caption={t.byMonth} density="compact">
            <THead>
              <TR>
                <TH>{t.byMonth}</TH>
                <TH align="end">{t.stays}</TH>
                <TH align="end">{t.monthGross}</TH>
                <TH align="end">{t.monthShare}</TH>
              </TR>
            </THead>
            <TBody>
              {earnings.months.map((month) => (
                <TR key={month.key}>
                  <TD className="font-medium text-[var(--nf-content-primary)]">
                    {monthLabel(month.year, month.month, locale)}
                  </TD>
                  <TD align="end">{month.stays}</TD>
                  <TD align="end">
                    <Amount minorUnits={month.grossMinor} locale={locale} />
                  </TD>
                  <TD align="end" className="font-semibold text-[var(--nf-content-primary)]">
                    <Amount minorUnits={month.agentShareMinor} locale={locale} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </section>

      <section className="nf-panel nf-panel--card block p-md sm:p-panel">
        <h2 className="nf-h3">{t.howTitle}</h2>
        <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          {t.howBody}
        </p>
      </section>
    </div>
  );
}
