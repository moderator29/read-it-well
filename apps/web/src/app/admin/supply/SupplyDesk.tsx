import Link from "next/link";
import { LiveRefresh } from "../_components/LiveRefresh";
import { formatDate, formatMoney, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { CalmNote, DeskHead, EmptyChart, Framed, Kpi, NumberedPager, Panel, TableNote, Waiting, lastMonths } from "../money/_desk/Desk";
import { Donut, RankBars, RankFrame, SeriesChart, SeriesLegend, StatusBar, type Series } from "../money/_desk/charts";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type { FirmRosters } from "@/lib/admin/reads/supply";
import { BadgeSlot } from "../money/_desk/BadgeSlot";
import type { BadgeTier } from "@/lib/admin/reads/badges";
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
  rosters,
  tiers = {},
  now,
}: {
  /** Badge tiers keyed by user id, from `public.person_badge`. */
  tiers?: Record<string, BadgeTier>;
  now: number;
  /** `getFirmRosters`: who works at which firm. Null when it could not be read. */
  rosters: FirmRosters | null;
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
    <div className="nf-console nf-md nf-md--supply">
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
                note={
                  !count
                    ? "Accounts on the platform in this role"
                    : count.now === 0
                      ? `No ${ROLE_LABEL[role].many.toLowerCase()} yet`
                      : "None a week ago to compare with"
                }
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
            <table className="nf-md-table">
              <SupplyHead />
              <tbody>
                <TableNote
                  columns={6}
                  note={{
                    title: filter.role
                      ? `No ${ROLE_LABEL[filter.role].many.toLowerCase()} yet${filter.examples ? "" : " outside the examples"}`
                      : `Nobody supplies the platform yet${filter.examples ? "" : " outside the examples"}`,
                    fills:
                      "Every owner, agent, firm and host, with their verification, live listings, what has been paid to them and when they joined.",
                    creates: "An account appears here when its application is approved on the verification desk.",
                    action: { href: "/admin/kyc", label: "Open the verification queue" },
                  }}
                />
              </tbody>
            </table>
          ) : (
            <>
              <table className="nf-md-table">
                <SupplyHead />
                <tbody>
                  {supply.rows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`}>
                      <td className="nf-md-lead nf-md-strong" data-label="">
                        {row.name}
                        {row.userId ? <BadgeSlot tier={tiers[row.userId]} /> : null}
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

        <GrowthPanel supply={supply} locale={locale} now={now} />
      </div>

      <div className="nf-md-grid nf-md-grid--halves">
        <Panel title="Top 5 areas by supply">
          {!supply ? (
            <Waiting
              title="Supply could not be read"
              body="The five areas with the most live listings and stays, ranked. The read did not answer just now."
            />
          ) : supply.topAreas.length === 0 ? (
            <Framed frame={<RankFrame />}>
              <CalmNote
                title="No live listing yet"
                fills="The five areas with the most live listings and stays, ranked."
                creates="A listing counts here once it is approved and published."
                action={{ href: "/admin/listings", label: "Open listing review" }}
              />
            </Framed>
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
            <Framed
              frame={
                <Donut
                  label="Live listings by property type"
                  totalLabel="Total"
                  totalValue="0"
                  slices={["home", "apartment", "land", "hotel", "shortlet", "restaurant"].map((t) => ({
                    label: PROPERTY_TYPE_LABEL[t] ?? t,
                    count: 0,
                  }))}
                />
              }
            >
              <CalmNote
                title="No live listing yet"
                fills="Live listings split by property type, from houses and flats to hotels and restaurants."
                creates="A listing counts here once it is approved and published."
                action={{ href: "/admin/listings", label: "Open listing review" }}
              />
            </Framed>
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

      <RostersPanel rosters={rosters} examples={filter.examples} locale={locale} tiers={tiers} />
    </div>
  );
}

const MEMBER_STATE: Record<string, { label: string; tone: StatusTone }> = {
  pending: { label: "Pending", tone: "warning" },
  active: { label: "Active", tone: "success" },
  revoked: { label: "Revoked", tone: "danger" },
};

/**
 * Who works at which firm (`firm_members`): exact counts by state on the
 * status four, then each firm's roster under its name, pending first, the
 * principal before staff. Read-only: admitting and revoking are
 * `private.admit_firm_member` and `private.revoke_firm_member`, each writing
 * an audit row, and no console control calls them.
 */
function RostersPanel({
  rosters,
  examples,
  locale,
  tiers,
}: {
  rosters: FirmRosters | null;
  examples: boolean;
  locale: Locale;
  tiers: Record<string, BadgeTier>;
}) {
  const title = "Firm rosters";
  const day = (iso: string) => formatDate(new Date(iso), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
  if (!rosters) {
    return (
      <Panel title={title}>
        <Waiting
          title="Firm rosters could not be read"
          body="Who works at each firm, pending, active and revoked. The read did not answer just now; reload in a moment."
        />
      </Panel>
    );
  }
  const b = rosters.byStatus;
  return (
    <Panel
      title={title}
      hint={`${rosters.total} ${rosters.total === 1 ? "membership" : "memberships"} across ${rosters.firms.length} ${rosters.firms.length === 1 ? "firm" : "firms"}${
        !examples && rosters.examplesExcluded > 0 ? `, ${rosters.examplesExcluded} at example firms left out` : ""
      }`}
    >
      <StatusBar
        label="Firm memberships by state"
        segments={[
          { key: "pending", label: "Pending", count: b.pending, tone: "pending" },
          { key: "active", label: "Active", count: b.active, tone: "good" },
          { key: "revoked", label: "Revoked", count: b.revoked, tone: "bad" },
        ]}
      />
      {rosters.firms.length === 0 ? (
        <table className="nf-md-table mt-md">
          <caption className="sr-only">Firm rosters</caption>
          <thead>
            <tr>
              <th scope="col">Agent</th>
              <th scope="col">Role</th>
              <th scope="col">State</th>
              <th scope="col">Since</th>
            </tr>
          </thead>
          <tbody>
            <TableNote
              columns={4}
              note={{
                title: `No firm has a roster yet${!examples && rosters.examplesExcluded > 0 ? " outside the examples" : ""}`,
                fills: "Every firm's members under its name: pending, active and revoked, the principal first, with the day each was admitted or revoked.",
                creates: "A firm's principal, or platform staff, admits an agent to a firm; each admission and revocation is written to the audit log.",
                action: { href: "/admin/businesses", label: "Open business review" },
              }}
            />
          </tbody>
        </table>
      ) : (
        rosters.firms.map((firm) => (
          <section key={firm.firmId} className="nf-md-roster mt-md" aria-label={firm.firmName ?? "A firm"}>
            <div className="nf-md-roster__head">
              <h4 className="nf-md-roster__name">{firm.firmName ?? "A firm with no name on record"}</h4>
              <span className="nf-md-roster__counts">
                {firm.counts.pending} pending · {firm.counts.active} active · {firm.counts.revoked} revoked
              </span>
            </div>
            <table className="nf-md-table">
              <caption className="sr-only">Members of {firm.firmName ?? "this firm"}</caption>
              <thead>
                <tr>
                  <th scope="col">Agent</th>
                  <th scope="col">Role</th>
                  <th scope="col">State</th>
                  <th scope="col">Since</th>
                </tr>
              </thead>
              <tbody>
                {firm.members.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Agent">
                      {m.agentName ?? "No display name"}
                      {m.userId ? <BadgeSlot tier={tiers[m.userId]} /> : null}
                    </td>
                    <td data-label="Role">{m.role === "principal" ? "Principal" : m.role === "staff" ? "Staff" : m.role}</td>
                    <td data-label="State">
                      <StatusPill tone={MEMBER_STATE[m.status]?.tone ?? "neutral"}>
                        {MEMBER_STATE[m.status]?.label ?? m.status}
                      </StatusPill>
                    </td>
                    <td className="nf-md-date" data-label="Since">
                      {m.status === "revoked" && m.revokedAt ? `Revoked ${day(m.revokedAt)}` : `Admitted ${day(m.admittedAt)}`}
                      {m.status === "revoked" && m.revokeNote ? <span className="nf-md-ref">{m.revokeNote}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      )}
    </Panel>
  );
}

function GrowthPanel({ supply, locale, now }: { supply: SupplyConsole | null; locale: Locale; now: number }) {
  const series: Series[] = SUPPLY_ROLE_KEYS.map((role, rank) => ({
    name: ROLE_LABEL[role].many,
    values: supply ? supply.growth.map((g) => g.counts[role]) : [],
    rank,
    area: rank === 0,
    dash: ROLE_DASH[role],
  }));
  const legend = <SeriesLegend series={series} />;
  const label = (month: string, year = false) =>
    formatDate(new Date(`${month}-15T12:00:00Z`), locale, {
      month: "short",
      ...(year ? { year: "numeric" } : {}),
      timeZone: "Africa/Lagos",
    });

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
        <EmptyChart
          height={220}
          yLabels={["0", "", "", "", ""]}
          xLabels={lastMonths(now, 6).map((m) => label(m))}
          note={{
            title: "No supply to chart yet",
            fills: "How many owners, agents, firms and hosts the platform has had at the end of each of the last six months.",
            creates: "Each approved application adds an account to its role's line.",
            action: { href: "/admin/agents", label: "Open agent applications" },
          }}
        />
      </Panel>
    );
  }
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

function SupplyHead() {
  return (
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
  );
}
