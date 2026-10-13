import type { ReactNode } from "react";
import { formatMoney, plural, type Dictionary, type Locale } from "@vallo/i18n/core";
import { KpiTile } from "@/components/ui/KpiTile";
import { Amount } from "@/components/ui/Amount";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { FrontDesk } from "@/lib/host/front-desk";
import type { TapeChart } from "@/lib/host/tape-chart";
import type { HotelRevenue } from "@/lib/host/tape-chart-read";
import "./dashboard.css";

type Words = Dictionary["hostDash"]["hotel"];

/**
 * THE HOTEL'S FIVE CARDS: arrivals today, in house, departures today,
 * occupancy tonight and what was paid this month. Server-safe; nothing here
 * fetches.
 *
 * Each figure is the one `buildFrontDesk` or `buildTapeChart` counted, or the
 * month's settled payments (`my_earnings_history`, the rows the payout
 * statement is made of). A figure that could not be read is a dash with a
 * plain sentence, never a zero nobody counted.
 */
export function HotelSummary({
  desk,
  chart,
  revenue,
  words,
  locale,
}: {
  desk: FrontDesk;
  chart: TapeChart;
  /** Null when the month's payments could not be read. */
  revenue: HotelRevenue | null;
  words: Words;
  locale: Locale;
}) {
  const tag = locale === "en" ? "en-NG" : locale;
  const f = desk.figures;

  const arrivalsSub = !desk.marksKnown
    ? words.fromDates
    : f.arrivalsToday === 0
      ? words.arrivalsNone
      : f.arrivalsToCheckIn === 0
        ? words.arrivalsAllIn
        : plural(f.arrivalsToCheckIn, words.arrivalsToCheckIn, locale);
  const inHouseSub = !desk.marksKnown
    ? words.inHouseFromDates
    : desk.leaving.length === 0
      ? words.inHouseNoneLeaving
      : plural(desk.leaving.length, words.inHouseLeaving, locale);
  const departuresSub = !desk.marksKnown
    ? words.fromDates
    : f.departuresToday === 0
      ? words.departuresNone
      : f.departuresToCheckOut === 0
        ? words.departuresAllOut
        : plural(f.departuresToCheckOut, words.departuresToCheckOut, locale);

  const tonight = chart.tonight;

  return (
    <section className="nf-dash" aria-label={words.summaryLabel} data-testid="hotel-summary">
      <div className="nf-dash__tiles nf-dash__tiles--five">
        <KpiTile icon="key" label={words.arrivals} value={f.arrivalsToday} tag={tag} sub={arrivalsSub} />
        <KpiTile icon="bed" label={words.inHouse} value={f.inHouse} tag={tag} sub={inHouseSub} />
        <KpiTile icon="door" label={words.departures} value={f.departuresToday} tag={tag} sub={departuresSub} />
        {tonight.pct === null ? (
          <PlainTile icon="chart-bar" label={words.occupancy} figure={"–"} sub={words.occupancyNone} />
        ) : (
          <KpiTile
            icon="chart-bar"
            label={words.occupancy}
            value={tonight.pct}
            unit="%"
            tag={tag}
            sub={plural(tonight.total, words.occupancyOf, locale).replace("{booked}", String(tonight.booked))}
          />
        )}
        {revenue === null ? (
          <PlainTile icon="banknote" label={words.revenue} className="nf-dash__tile--money" figure={"–"} sub={words.revenueUnavailable} />
        ) : (
          <PlainTile
            icon="banknote"
            label={words.revenue}
            className="nf-dash__tile--money"
            figure={<Amount minorUnits={revenue.shareMinor} locale={locale} />}
            sub={
              revenue.payments === 0 && revenue.grossMinor === 0
                ? words.revenueNone
                : words.revenueShare
                    .replace("{paid}", formatMoney(revenue.grossMinor, locale))
                    .replace("{fee}", formatMoney(revenue.commissionMinor, locale))
            }
          />
        )}
      </div>
    </section>
  );
}

/** A tile in the KPI tile's own markup, for a figure that is not a plain count. */
function PlainTile({
  icon,
  label,
  figure,
  sub,
  className,
}: {
  icon: UiIconName;
  label: string;
  figure: ReactNode;
  sub: ReactNode;
  className?: string;
}) {
  return (
    <div className={["nf-kpi", className ?? ""].filter(Boolean).join(" ")}>
      <p className="nf-kpi__head">
        <UiIcon name={icon} size={16} className="nf-kpi__glyph" />
        <span className="nf-section-label nf-kpi__label">{label}</span>
      </p>
      <p className="nf-kpi__figure">{figure}</p>
      <p className="nf-kpi__sub">{sub}</p>
    </div>
  );
}
