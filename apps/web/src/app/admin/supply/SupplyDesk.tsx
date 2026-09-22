import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { DeskHead, Kpi, NumberedPager, Panel, Waiting } from "../money/_desk/Desk";
import { Donut, RankBars, SeriesChart, SeriesLegend, type Series } from "../money/_desk/charts";
import { percentChange } from "@/lib/admin/reads/money-derive";
import {
  SUPPLY_ROLE_KEYS,
  type SupplyConsole,
  type SupplyRoleKey,
} from "@/lib/admin/reads/money-types";

/**
 * The supply desk, drawn from one `SupplyConsole` (`getSupplyDesk` in
 * `lib/admin/reads/supply.ts`), or from nothing when that read could not
 * answer, in which case every panel says what it shows and draws no number.
 *
 * THE ROLE VOCABULARY is the product's own (`lib/supply/roles.ts`,
 * `lib/supply/workspaces-queries.ts`): owner and agent are kinds of PERSON, a
 * firm is an agency business, and a host is every other business on the
 * stays side. Four doors, no fifth.
 */

export const ROLE_LABEL: Record<SupplyRoleKey, { one: string; many: string }> = {
  owner: { one: "Owner", many: "Owners" },
  agent: { one: "Agent", many: "Agents" },
  firm: { one: "Firm", many: "Firms" },
  host: { one: "Host", many: "Hosts" },
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  apartment: "Flats",
  home: "Houses",
  villa: "Villas",
  rental: "Rentals",
  shortlet: "Shortlets",
  hotel: "Hotels",
  land: "Land",
  shop: "Shops",
  office: "Offices",
  restaurant: "Restaurants",
};

/** Dash patterns so four series never rest on colour alone (research part four). */
const ROLE_DASH: Record<SupplyRoleKey, string | undefined> = {
  owner: undefined,
  agent: "8 4",
  firm: "3 4",
  host: "1 5",
};

export type SupplyFilter = { role?: SupplyRoleKey; examples: boolean; page: number };

export function SupplyDesk({
  supply,
  filter,
  params,
  locale,
  pageSize,
}: {
  supply: (SupplyConsole & { complete?: boolean }) | null;
  filter: SupplyFilter;
  params: Record<string, string | undefined>;
  locale: Locale;
  pageSize: number;
}) {
  const hrefWith = (next: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { ...params, ...next, page: undefined };
    const qs = new URLSearchParams(
      Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])),
    ).toString();
    return qs ? `/admin/supply?${qs}` : "/admin/supply";
  };

  const examplesToggle = (
    <Link
      href={hrefWith({ examples: filter.examples ? undefined : "1" })}
      className="nf-md-toggle"
      aria-pressed={filter.examples}
    >
      <UiIcon name={filter.examples ? "eye" : "eye-off"} size={16} />
      {filter.examples ? "Including examples" : "Examples left out"}
    </Link>
  );

  return (
    <div className="nf-console nf-md">
      <LiveRefresh />
      <DeskHead
        title="Supply"
        lede="More supply. More choice. A stronger marketplace."
        aside={examplesToggle}
      />

      <div className="nf-md-kpis" role="list" aria-label="Supply by role">
        {SUPPLY_ROLE_KEYS.map((role) => {
          const count = supply?.counts[role];
          return (
            <div role="listitem" key={role} className="contents">
              <Kpi
                label={ROLE_LABEL[role].many}
                value={count ? String(count.now) : null}
                delta={
                  count
                    ? { percent: percentChange(count.now, count.weekAgo), against: "vs last week" }
                    : null
                }
                note={count ? "No accounts a week ago to compare with" : "Accounts on the platform in this role"}
                href={hrefWith({ role: filter.role === role ? undefined : role })}
                current={filter.role === role}
              />
            </div>
          );
        })}
      </div>

      {supply && supply.complete === false && (
        <p className="nf-md-panel__hint">
          There are more accounts than this desk reads in one pass, so these counts are at least these numbers.
        </p>
      )}
      {supply && !filter.examples && supply.examplesExcluded > 0 && (
        <p className="nf-md-panel__hint">
          {supply.examplesExcluded} example {supply.examplesExcluded === 1 ? "account is" : "accounts are"} left
          out of every figure on this page. They are seeded so the catalogue is not empty; the Examples desk
          manages them.
        </p>
      )}

      <div className="nf-md-grid nf-md-grid--main">
        <Panel
          title={filter.role ? `Supply by role: ${ROLE_LABEL[filter.role].many}` : "Supply by role"}
          hint={supply ? `${supply.total} ${supply.total === 1 ? "account" : "accounts"}` : undefined}
        >
          {!supply ? (
            <Waiting
              title="Supply could not be read"
              body="Every owner, agent, firm and host with their verification, how many listings they hold, how much has been paid to them and when they joined. The read did not answer just now; reload in a moment."
            />
          ) : supply.rows.length === 0 ? (
            <p className="nf-md-empty">
              {filter.role
                ? `No ${ROLE_LABEL[filter.role].many.toLowerCase()} yet.`
                : "Nobody supplies the platform yet. Owners, agents, firms and hosts appear here as they are approved."}
            </p>
          ) : (
            <>
              <table className="nf-md-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                    <th scope="col" className="nf-md-num">
                      Listings
                    </th>
                    <th scope="col">Verified</th>
                    <th scope="col" className="nf-md-num">
                      Total transacted
                    </th>
                    <th scope="col" className="nf-md-num">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {supply.rows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`}>
                      <td className="nf-md-lead nf-md-strong" data-label="">
                        {row.name}
                      </td>
                      <td data-label="Role">{ROLE_LABEL[row.role].one}</td>
                      <td className="nf-md-num" data-label="Listings">
                        {row.listings}
                      </td>
                      <td data-label="Verified">
                        {row.verified ? (
                          <span className="nf-md-mark nf-md-mark--yes">
                            <UiIcon name="verified" size={16} /> Yes
                          </span>
                        ) : (
                          <span className="nf-md-mark nf-md-mark--no">
                            <UiIcon name="close" size={16} /> No
                          </span>
                        )}
                      </td>
                      <td className="nf-md-num nf-md-strong" data-label="Total transacted">
                        {formatMoney(row.transactedMinor, locale, "NGN", { compact: row.transactedMinor >= 100_000_000 })}
                      </td>
                      <td className="nf-md-num" data-label="Joined">
                        {formatDate(new Date(row.joinedAt), locale, {
                          month: "short",
                          year: "numeric",
                          timeZone: "Africa/Lagos",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <NumberedPager
                base="/admin/supply"
                params={params}
                page={supply.page}
                total={supply.total}
                pageSize={pageSize}
                noun="accounts"
              />
            </>
          )}
        </Panel>

        <GrowthPanel supply={supply} locale={locale} />
      </div>

      <div className="nf-md-grid nf-md-grid--halves">
        <Panel title="Top 5 areas by supply">
          {!supply ? (
            <Waiting
              title="Supply could not be read"
              body="The five areas with the most live listings and stays, ranked. The read did not answer just now."
            />
          ) : supply.topAreas.length === 0 ? (
            <p className="nf-md-empty">No live listing has an area yet.</p>
          ) : (
            <RankBars rows={supply.topAreas.slice(0, 5).map((a) => ({ label: a.area, count: a.count }))} />
          )}
        </Panel>
        <Panel title="Supply by property type">
          {!supply ? (
            <Waiting
              title="Supply could not be read"
              body="Live listings split by property type, from houses and flats to hotels and restaurants. The read did not answer just now."
            />
          ) : supply.byPropertyType.length === 0 ? (
            <p className="nf-md-empty">No live listing yet.</p>
          ) : (
            <Donut
              label="Live listings by property type"
              totalLabel="Total"
              totalValue={String(supply.byPropertyType.reduce((s, x) => s + x.count, 0))}
              slices={supply.byPropertyType.map((p) => ({
                label: PROPERTY_TYPE_LABEL[p.type] ?? p.type,
                count: p.count,
              }))}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function GrowthPanel({ supply, locale }: { supply: SupplyConsole | null; locale: Locale }) {
  const series: Series[] = SUPPLY_ROLE_KEYS.map((role, rank) => ({
    name: ROLE_LABEL[role].many,
    values: supply ? supply.growth.map((g) => g.counts[role]) : [],
    rank,
    area: rank === 0,
    dash: ROLE_DASH[role],
  }));
  const legend = <SeriesLegend series={series} />;

  if (!supply) {
    return (
      <Panel title="Supply growth by role" aside={legend}>
        <Waiting
          title="Supply could not be read"
          body="How many owners, agents, firms and hosts the platform has had at the end of each of the last six months. The read did not answer just now."
        />
      </Panel>
    );
  }
  if (supply.growth.length < 2) {
    return (
      <Panel title="Supply growth by role" aside={legend}>
        <p className="nf-md-empty">A trend needs two months of supply. There is not a line to draw yet.</p>
      </Panel>
    );
  }
  const label = (month: string, year = false) =>
    formatDate(new Date(`${month}-15T12:00:00Z`), locale, {
      month: "short",
      ...(year ? { year: "numeric" } : {}),
      timeZone: "Africa/Lagos",
    });
  return (
    <Panel title="Supply growth by role" aside={legend}>
      <SeriesChart
        id="supply-growth"
        xLabels={supply.growth.map((g) => label(g.month))}
        series={series}
        directLabels
        width={380}
        height={300}
        label="Accounts in each supply role at the end of each month"
        yLabel={(v) => String(Math.round(v))}
        readout={supply.growth.map((g) => ({
          title: label(g.month, true),
          rows: SUPPLY_ROLE_KEYS.map((role) => ({ label: ROLE_LABEL[role].many, value: String(g.counts[role]) })),
        }))}
      />
    </Panel>
  );
}
