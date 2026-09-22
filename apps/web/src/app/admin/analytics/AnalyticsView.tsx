import { formatDate, formatNumber, getDictionary, type Locale } from "@vallo/i18n";
import { tx } from "@/app/admin/_components/shell-text";
import { AreaTimeChart } from "@/components/agent/charts/AreaTimeChart";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import type { BookingOutcomes, CollectedRange, ThinAreas } from "@/lib/admin/reads/shapes";
import { niceTicks, periodDelta } from "../_components/metrics";
import {
  CalmNote,
  EmptyChart,
  KpiGrid,
  NotWired,
  PageHead,
  Panel,
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


export function AnalyticsView({ locale, range, bookings, supply, thin }: AnalyticsProps) {
  const shell = getDictionary(locale).admin.shell;
  const c = shell.analytics;
  const notRecorded = (request: string) => ({ value: null, missingWord: shell.states.notRecorded, pending: `Nothing records this yet. Request ${request}.` });
  const kpis: KpiItem[] = [
    { key: "searches", icon: { tier: "ui", name: "search" }, label: c.totalSearches, ...notRecorded("A7") },
    { key: "views", icon: { tier: "ui", name: "eye" }, label: c.listingViews, ...notRecorded("A8") },
    {
      key: "bookings",
      icon: { tier: "ui", name: "calendar-booking" },
      label: c.successfulBookings,
      value: bookings ? formatNumber(bookings.successful, locale) : null,
      delta: bookings ? periodDelta(bookings.successful, bookings.successfulPrev) : null,
      caption: { "30d": c.vsPrev30, "90d": c.vsPrev90, "12m": c.vsPrev12 }[range],
      href: "/admin/bookings",
      pending: "The booking count did not load; it retries every minute",
    },
    { key: "conversion", icon: { tier: "admin", name: "bars" }, label: c.conversion, ...notRecorded("A7 and A8") },
  ];

  return (
    <div className="nf-admin-stack">
      <PageHead
        title={c.title}
        lede={c.lede}
        action={
          <RangeSelect
            value={range}
            options={{ "30d": shell.overview.range30, "90d": shell.overview.range90, "12m": shell.overview.range12 }}
            label={shell.overview.range30}
          />
        }
      />
      <KpiGrid items={kpis} label={c.title} />

      <Panel id="an-demand" title={c.demandSupply}>
        <DemandSupply supply={supply} range={range} locale={locale} />
      </Panel>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="an-top-areas" title={c.topAreas}>
          <div className="nf-admin-dist" aria-hidden="true">
            <div className="nf-admin-dist__row nf-admin-dist__row--head nf-admin-dist__row--area">
              <span>Area</span>
              <span />
              <span className="nf-admin-dist__num">Searches</span>
            </div>
          </div>
          <NotWired
            what={tx(locale, "anTheAreasPeopleSearchMost")}
            request={tx(locale, "anNothingRecordsASearchYet")}
          />
        </Panel>
        <Panel id="an-thin" title={c.thinAreas}>
          <ThinAreasTable thin={thin} locale={locale} />
        </Panel>
      </div>

      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="an-results" title={c.searchesResults}>
          <EmptyChart
            height={160}
            yLabels={niceTicks(10, 5).map((v) => String(v))}
            legend={["Searches", "Results"]}
            xLabels={[]}
            note={{
              kind: "unwired",
              title: tx(locale, "anNotRecordedYet"),
              fills: tx(locale, "anSearchesAgainstTheSearchesThat"),
              creates: tx(locale, "anNothingRecordsASearchYet"),
            }}
          />
        </Panel>
        <Panel id="an-refusals" title={c.refusals}>
          <div className="nf-admin-dist" aria-hidden="true">
            <div className="nf-admin-dist__row nf-admin-dist__row--head nf-admin-dist__row--area">
              <span>Reason</span>
              <span />
              <span className="nf-admin-dist__num">Count</span>
            </div>
          </div>
          <NotWired
            what={tx(locale, "anWhyOwnersAndHostsDecline")}
            request={tx(locale, "anTodayADeclineCarriesFree")}
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
  if (!supply) return <PanelUnavailable what={tx(locale, "anNewSupplyOverTime")} locale={locale} />;
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
        <EmptyChart
          height={200}
          yLabels={niceTicks(10, 5).map((v) => String(v))}
          xLabels={supply.map((b, i) => (monthly || i % (range === "90d" ? 3 : 7) === 0 ? label(b.start, false) : ""))}
          note={{
            title: tx(locale, "anNoRealListingCreatedIn"),
            fills: tx(locale, "anTheLineCountsEachNew"),
            creates: tx(locale, "anSearchesAreDrawnBesideIt"),
            action: { href: "/admin/supply", label: "Open Supply" },
          }}
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
  if (!thin) return <PanelUnavailable what={tx(locale, "anSupplyByArea")} locale={locale} />;
  if (thin.rows.length === 0) {
    return (
      <>
        <div className="nf-admin-dist" aria-hidden="true">
          <div className="nf-admin-dist__row nf-admin-dist__row--head nf-admin-dist__row--area">
            <span>Area</span>
            <span />
            <span className="nf-admin-dist__num">Listings</span>
          </div>
        </div>
        <CalmNote
          title={tx(locale, "anNoRealListingLiveIn")}
          fills={tx(locale, "anTheAreasWithTheLeast")}
          creates={tx(locale, "anAreasAppearAsOwnersAgents")}
          action={{ href: "/admin/listings", label: "Open the listings queue" }}
        />
      </>
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
