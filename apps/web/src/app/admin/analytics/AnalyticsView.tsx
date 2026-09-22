import { formatDate, formatNumber, type Locale } from "@vallo/i18n";
import { AreaTimeChart } from "@/components/agent/charts/AreaTimeChart";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import type { BookingOutcomes, CollectedRange, ThinAreas } from "@/lib/admin/reads/shapes";
import { niceTicks, periodDelta } from "../_components/metrics";
import {
  KpiGrid,
  NotWired,
  PageHead,
  Panel,
  PanelEmpty,
  PanelUnavailable,
  type KpiItem,
} from "../_components/panels";
import { RangeSelect } from "../_components/RangeSelect";

/**
 * ANALYTICS, drawn from 01F7DFC7 panel three: four KPI cards, demand against
 * supply, top areas by searches, areas with the fewest listings, searches
 * against results, and the most common refusals.
 *
 * HALF OF THAT PICTURE HAS NO SOURCE, and this screen says so rather than
 * drawing it. Nothing on the platform records a search, a listing view or a
 * structured reason for a refusal, so searches, views, conversion, demand,
 * top areas by searches, searches against results and refusals are "Not
 * recorded" with the request that would start recording them (A7, A8, A11
 * in docs/SESSION_B_SCOPE.md). What is real is drawn: bookings that went
 * through, new supply over time and where supply is thinnest, examples
 * excluded from both.
 */
export type AnalyticsProps = {
  locale: Locale;
  range: CollectedRange;
  bookings: BookingOutcomes | null;
  supply: { start: string; listings: number }[] | null;
  thin: ThinAreas | null;
};

const RANGE_LABEL: Record<CollectedRange, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
};
const PERIOD_WORD: Record<CollectedRange, string> = {
  "30d": "vs the 30 days before",
  "90d": "vs the 90 days before",
  "12m": "vs the year before",
};

export function AnalyticsView({ locale, range, bookings, supply, thin }: AnalyticsProps) {
  const notRecorded = (request: string) => ({ value: null, missingWord: "Not recorded", pending: `Nothing records this yet. Request ${request}.` });
  const kpis: KpiItem[] = [
    { key: "searches", icon: { tier: "ui", name: "search" }, label: "Total searches", ...notRecorded("A7") },
    { key: "views", icon: { tier: "ui", name: "eye" }, label: "Listing views", ...notRecorded("A8") },
    {
      key: "bookings",
      icon: { tier: "ui", name: "calendar-booking" },
      label: "Successful bookings",
      value: bookings ? formatNumber(bookings.successful, locale) : null,
      delta: bookings ? periodDelta(bookings.successful, bookings.successfulPrev) : null,
      caption: PERIOD_WORD[range],
      href: "/admin/bookings",
      pending: "The booking count did not load; it retries every minute",
    },
    { key: "conversion", icon: { tier: "admin", name: "bars" }, label: "Conversion rate", ...notRecorded("A7 and A8") },
  ];

  return (
    <div className="nf-admin-stack">
      <PageHead
        title="Analytics"
        lede="Understand demand, supply and performance."
        action={<RangeSelect value={range} options={RANGE_LABEL} label="Range" />}
      />
      <KpiGrid items={kpis} label="Performance" />

      <Panel id="an-demand" title="Demand vs supply">
        <DemandSupply supply={supply} range={range} locale={locale} />
      </Panel>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="an-top-areas" title="Top areas by searches">
          <NotWired
            what="Which areas people search most needs every search recorded with its area."
            request="Request A7 (a search event log) is open with the other session."
          />
        </Panel>
        <Panel id="an-thin" title="Areas with fewest listings">
          <ThinAreasTable thin={thin} locale={locale} />
        </Panel>
      </div>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="an-results" title="Searches vs results returned">
          <NotWired
            what="How many searches came back with nothing needs each search recorded with its result count."
            request="Request A7 covers it."
          />
        </Panel>
        <Panel id="an-refusals" title="Top common refusals">
          <NotWired
            what="Why owners and hosts decline needs a reason chosen from a fixed list when they do; today a decline carries free text or nothing."
            request="Request A11 is open with the other session."
          />
        </Panel>
      </div>
    </div>
  );
}

function DemandSupply({
  supply,
  range,
  locale,
}: {
  supply: { start: string; listings: number }[] | null;
  range: CollectedRange;
  locale: Locale;
}) {
  if (!supply) return <PanelUnavailable what="New supply over time" />;
  const total = supply.reduce((sum, b) => sum + b.listings, 0);
  const monthly = range === "12m";
  const label = (start: string, withYear: boolean) =>
    formatDate(new Date(`${start.length === 7 ? `${start}-01` : start}T12:00:00+01:00`), locale, {
      timeZone: "Africa/Lagos",
      ...(monthly ? { month: "short" } : { day: "numeric", month: "short" }),
      ...(withYear ? { year: "numeric" } : null),
    });
  return (
    <>
      <ul className="nf-chart__legend nf-chart__legend--static" aria-label="Series">
        <li>
          <span className="nf-chart__swatch nf-chart__bar--s0" aria-hidden="true" />
          Listings created
        </li>
        <li className="nf-chart__legend-off">
          <span className="nf-chart__swatch nf-chart__swatch--off" aria-hidden="true" />
          Searches: not recorded yet (Request A7)
        </li>
      </ul>
      {total === 0 ? (
        <PanelEmpty
          title="No real listing created in this range"
          body="The line draws each new listing from a real owner, agent or firm; examples are not counted. Searches will be drawn beside it once they are recorded."
        />
      ) : (
        <AreaTimeChart
          label="Listings created per period"
          points={supply.map((b) => ({
            key: b.start,
            tick: label(b.start, false),
            readout: label(b.start, true),
            value: b.listings,
            display: `${formatNumber(b.listings, locale)} listings`,
          }))}
          yTicks={niceTicks(Math.max(...supply.map((b) => b.listings))).map((v) => ({ value: v, label: formatNumber(v, locale) }))}
          height={200}
          tickEvery={monthly ? 1 : range === "90d" ? 2 : 5}
        />
      )}
    </>
  );
}

function ThinAreasTable({ thin, locale }: { thin: ThinAreas | null; locale: Locale }) {
  if (!thin) return <PanelUnavailable what="Supply by area" />;
  if (thin.rows.length === 0) {
    return (
      <PanelEmpty
        title="No real listing live in any area yet"
        body="Once owners, agents and firms list, the areas with the least on offer are named here so supply can be sought there first."
      />
    );
  }
  const max = Math.max(...thin.rows.map((r) => r.count));
  return (
    <div className="nf-admin-dist" role="table" aria-label="Areas with fewest listings">
      <div className="nf-admin-dist__row nf-admin-dist__row--head nf-admin-dist__row--area" role="row">
        <span role="columnheader">Area</span>
        <span role="columnheader" className="sr-only">Share</span>
        <span role="columnheader" className="nf-admin-dist__num">Listings</span>
      </div>
      {thin.rows.map((row) => (
        <div key={`${row.area}-${row.city ?? ""}`} className="nf-admin-dist__row nf-admin-dist__row--area" role="row">
          <span className="nf-admin-dist__name" role="cell">
            {row.area}
            {row.city && <span className="nf-admin-dt__sub">{row.city}</span>}
          </span>
          <span role="cell">
            <MeterBar value={row.count} max={max} rank={1} />
          </span>
          <span className="nf-admin-dist__num nf-numeric" role="cell">{formatNumber(row.count, locale)}</span>
        </div>
      ))}
    </div>
  );
}
