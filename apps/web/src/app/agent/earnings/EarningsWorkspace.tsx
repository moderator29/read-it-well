import { formatDate, formatMoney, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { fill } from "../_copy";
import type { AgentEarnings } from "@/lib/agent/earnings-queries";
import { ButtonLink } from "@/components/ui/Button";
import { Amount, Figure } from "@/components/ui/Amount";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Icon3D } from "@/components/ui/Icon3D";
import { PeriodBars } from "@/components/ui/charts/PeriodBars";
import { CompareBars, type CompareRow } from "@/components/ui/charts/CompareBars";
import { lagosMonth, monthPoint, moneyTicks } from "@/components/agent/charts/month-points";
import { settledSeries } from "@/lib/agent/analytics-queries";
/* North star 12 point 17: a money sentence reads from lib/money/copy.ts. The
   empty state and the how-it-is-worked-out note were the dictionary's own
   sentences (agentEarnings.emptyTitle, emptyBody, howBody), and howBody still
   described a split into "your share, Vallo's platform fee and the payment
   processor's own fee" beside a file docstring that says the page names no
   platform cut. copy.ts already holds the lister's sentences for both. */
import { EARNINGS_EMPTY_BODY, EARNINGS_EMPTY_TITLE, EARNINGS_SETTLEMENT } from "@/lib/money/copy";

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
        className="rounded-[var(--nf-container-radius)] p-md text-[length:var(--nf-text-body-sm)] font-semibold leading-relaxed"
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
        {/* The founder's 3D earnings hand (30 September), 88px, fixed box. */}
        <span className="grid size-[5.5rem] place-items-center" aria-hidden="true" data-art="earnings">
          <Icon3D name="earnings" size={88} />
        </span>
        <h2 className="nf-h3">{EARNINGS_EMPTY_TITLE}</h2>
        <p className="mx-auto max-w-[40ch] text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
          {EARNINGS_EMPTY_BODY}
        </p>
        <ButtonLink href="/agent/bookings" variant="primary">
          {t.emptyAction}
        </ButtonLink>
      </div>
    );
  }

  const thisMonthMinor = earnings.currentMonth?.agentShareMinor ?? 0;

  /*
   * THE MONTHS AS BARS (reference 7056, chart system B-26). The same rows the
   * ledger table below prints, laid out as a continuous run by the analytics
   * read's own rule (`settledSeries`: a quiet month between two settled ones
   * is a real zero; nothing is padded before the first). The table stays: it
   * is the record, the bars are how the record reads at a glance.
   */
  const nowKey = lagosMonth(new Date());
  const series = settledSeries(earnings.months, nowKey).map((m) =>
    monthPoint({ key: m.key, year: m.year, month: m.month, minor: m.agentShareMinor }, locale),
  );
  const compare = monthOnMonth(earnings, nowKey, t, locale);

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
                count
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
                count
            />
          }
        />
        <Tile
          icon="calendar-check"
          label={t.totals.settledStays}
          value={
            <Figure value={earnings.settledStays} locale={locale} className={TILE_FIGURE}
                count />
          }
        />
        <Tile
          icon="trending-up"
          label={t.totals.thisMonth}
          value={<Amount minorUnits={thisMonthMinor} locale={locale} className={TILE_FIGURE}
                count />}
        />
      </div>

      {compare ? (
        <section className="nf-panel nf-panel--card block p-md sm:p-panel">
          <CompareBars
            label={`${compare.currentLabel}, ${compare.previousLabel}`}
            currentLabel={compare.currentLabel}
            previousLabel={compare.previousLabel}
            rows={compare.rows}
          />
        </section>
      ) : null}

      <section className="nf-panel nf-panel--card block p-md sm:p-panel">
        <h2 className="nf-h3">{t.byMonth}</h2>

        {series.length > 1 ? (
          <div className="mt-md">
            <PeriodBars
              points={series}
              yTicks={moneyTicks(series, locale)}
              label={`${t.byMonth}, ${t.monthShare}`}
              periodHead={t.byMonth}
              valueHead={t.monthShare}
              emphasis="peak"
            />
          </div>
        ) : null}

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
                  <TD className="font-semibold text-[var(--nf-content-primary)]">
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
          {EARNINGS_SETTLEMENT}
        </p>
      </section>
    </div>
  );
}

/**
 * THIS MONTH AGAINST LAST MONTH (north star 15.3, chart rule 1, compare
 * bars), from the ledger rows this page already read and nothing else.
 *
 * The ledger is the complete record of settled money, so a month with no row
 * after the first settled month is a real zero and is drawn as one. Before
 * the first settled month there is no record to compare with, so the previous
 * side is null and the row says so with a dash rather than a zero that would
 * read as a bad month. With nothing on either side the comparison is left
 * out: two empty bars are not a comparison.
 *
 * The legend names the two months by name, in the reader's language, which
 * needs no new copy and is more exact than "this month" and "last month".
 */
function monthOnMonth(
  earnings: AgentEarnings,
  nowKey: string,
  t: EarningsCopy,
  locale: Locale,
): { currentLabel: string; previousLabel: string; rows: CompareRow[] } | null {
  const [y, m] = nowKey.split("-").map(Number);
  if (!y || !m) return null;
  const prevIndex = y * 12 + (m - 1) - 1;
  const prevYear = Math.floor(prevIndex / 12);
  const prevMonth = (prevIndex % 12) + 1;
  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const byKey = new Map(earnings.months.map((month) => [month.key, month]));
  const current = byKey.get(nowKey) ?? null;
  const previous = byKey.get(prevKey) ?? null;
  const firstKey = [...byKey.keys()].sort()[0];
  /* Before the first settled month there is nothing on record to compare. */
  const previousOnRecord = firstKey !== undefined && firstKey <= prevKey;
  if (!current && !previous) return null;

  const dash = "\u2013";
  const money = (v: number | null) => (v === null ? dash : formatMoney(v, locale));
  const count = (v: number | null) => (v === null ? dash : formatNumber(v, locale));
  const prev = <K extends "agentShareMinor" | "grossMinor" | "stays">(key: K): number | null =>
    previousOnRecord ? (previous?.[key] ?? 0) : null;

  return {
    currentLabel: monthLabel(y, m, locale),
    previousLabel: monthLabel(prevYear, prevMonth, locale),
    rows: [
      {
        key: "share",
        label: t.monthShare,
        current: current?.agentShareMinor ?? 0,
        currentDisplay: money(current?.agentShareMinor ?? 0),
        previous: prev("agentShareMinor"),
        previousDisplay: money(prev("agentShareMinor")),
      },
      {
        key: "gross",
        label: t.monthGross,
        current: current?.grossMinor ?? 0,
        currentDisplay: money(current?.grossMinor ?? 0),
        previous: prev("grossMinor"),
        previousDisplay: money(prev("grossMinor")),
      },
      {
        key: "stays",
        label: t.totals.settledStays,
        current: current?.stays ?? 0,
        currentDisplay: count(current?.stays ?? 0),
        previous: prev("stays"),
        previousDisplay: count(prev("stays")),
      },
    ],
  };
}
