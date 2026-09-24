import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import {
  getAgentApplications,
  getListingSubmissions,
  getMessageFlags,
  getQueueCounts,
  getReports,
  getSupportTickets,
} from "@/lib/admin/queries";
import { adminUi } from "../_components/ui";
import { QueueFilters, readQueueQuery } from "../_components/QueueFilters";
import { QueueTable, QueueTabs, shortRef, type QueueRowData } from "../_components/QueueTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatDate } from "@vallo/i18n";
import {
  byDue,
  claimIsLive,
  clockFor,
  gradeFor,
  probablyNotAPerson,
  reportWeight,
  viewHref,
  type Clock,
  type QueueKind,
  type Weight,
} from "@/lib/admin/queue-desk";
import { loadDesk } from "@/lib/admin/reads/queue-desk";
import { bulkAct, deleteView, releaseRow, saveView, takeRow } from "@/lib/admin/queue-desk-actions";

export const dynamic = "force-dynamic";

/**
 * The Admin Queue: where the work is, right now, as one table.
 *
 * IT MOVED HERE FROM `/admin`, WHICH IS THE WHOLE OF THE FOUNDER'S ITEM 5.
 * "Going into the admin console should land on the overview, every time,
 * before any individual desk. Right now it drops straight into an area.
 * Overview first, then I choose where to go." This page is an area: it is one
 * table of five queues with a filter bar and forty rows, and it was what
 * `/admin` rendered. It is still one tap away - the overview's own list leads
 * here, and it is the first row of the console rail under Overview - and it
 * is no longer what the console opens on.
 *
 * Nothing about the table itself changed. The hrefs it builds for its own
 * tabs and filters now say `/admin/queue` rather than `/admin`, which is the
 * only edit: a tab that pointed at `/admin` would have thrown an operator
 * back out to the overview on every filter change.
 *
 * 278CC66A and CDA4B82B draw the console opening on a single queue across
 * every kind of work, with count tabs above it. The platform has no unified
 * queue table, so this is composed from the five readers that exist (listing
 * submissions, agent applications, reports, support tickets and message
 * flags), each read under the same admin gate the desks use, mapped onto one
 * row shape and ordered newest first. Every count on a tab is the live
 * count from `getQueueCounts`; every View goes to the desk that clears the
 * row. Nothing is invented and nothing here can act on a row: the decision
 * controls stay on the desks, which is where the audit log expects them.
 *
 * `?tab=` narrows to one kind; `?q=` runs the search each desk already has.
 *
 * V-89, THE QUEUE BECOMES A DESK. Rows waiting on a decision now carry the
 * promise they are under (`lib/trust/standards.ts`) and sort by when it falls
 * due, not by newest; a report is weighted inside its clock by what its
 * reporter has shown, and the row says why. Every row has an owner slot
 * (take it, let it go, free again after 30 idle minutes). Lanes narrow to
 * late, mine and unowned rows, and "Probably not a person" holds support
 * tickets from no account that carry a link or a domain pitch, off the
 * clock. Rows can be decided in bulk through the desks' own actions, one
 * audit row each under one batch id, and a filter set can be saved and
 * shared by link.
 */

type TabKey = "all" | "listings" | "applications" | "reports" | "tickets" | "flags";
type Lane = "all" | "late" | "mine" | "free" | "spam";
const LANES: Lane[] = ["all", "late", "mine", "free", "spam"];

const TABS: { key: TabKey; label: string; href: string }[] = [
  { key: "all", label: "All", href: "/admin/queue" },
  { key: "listings", label: "Listings", href: "/admin/queue?tab=listings" },
  { key: "applications", label: "Agents", href: "/admin/queue?tab=applications" },
  { key: "reports", label: "Reports", href: "/admin/queue?tab=reports" },
  { key: "tickets", label: "Support", href: "/admin/queue?tab=tickets" },
  { key: "flags", label: "Flags", href: "/admin/queue?tab=flags" },
];

/** The other queues the table does not fold in yet, still one tap away. */
const MORE: { key: string; icon: UiIconName; href: string }[] = [
  { key: "moderation", icon: "sliders", href: "/admin/moderation" },
  { key: "alerts", icon: "bell", href: "/admin/alerts" },
];

export default async function AdminQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const o = t.admin.overview;
  const ui = adminUi(t, locale);
  const params = await searchParams;
  const query = readQueueQuery(params);
  const tabRaw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabKey = TABS.some((entry) => entry.key === tabRaw) ? (tabRaw as TabKey) : "all";
  const laneRaw = Array.isArray(params.lane) ? params.lane[0] : params.lane;
  const lane: Lane = LANES.includes(laneRaw as Lane) ? (laneRaw as Lane) : "all";
  const one = (key: string) => {
    const raw = params[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  const desk = t.platform.queueDesk;
  const filter = query.q ? { q: query.q } : {};
  const wants = (key: TabKey) => tab === "all" || tab === key;

  const [counts, listings, applications, reports, tickets, flags] = await Promise.all([
    getQueueCounts(),
    wants("listings") ? getListingSubmissions(filter) : null,
    wants("applications") ? getAgentApplications(filter) : null,
    wants("reports") ? getReports(filter) : null,
    wants("tickets") ? getSupportTickets(filter) : null,
    wants("flags") ? getMessageFlags(filter) : null,
  ]);

  if (counts.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={o.queueTitle} lede={o.queueLede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const total =
    counts.data.listings +
    counts.data.applications +
    counts.data.reports +
    counts.data.tickets +
    counts.data.flags;
  const countFor: Record<TabKey, number> = {
    all: total,
    listings: counts.data.listings,
    applications: counts.data.applications,
    reports: counts.data.reports,
    tickets: counts.data.tickets,
    flags: counts.data.flags,
  };

  type DeskRow = QueueRowData & { at: string; kind: QueueKind; itemId: string; clock: Clock | null; weight?: Weight; spam?: boolean };
  const rows: DeskRow[] = [];
  const now = new Date();
  if (listings?.state === "ok") {
    const waitingIds = new Set(listings.data.waiting.map((l) => l.id));
    for (const listing of [...listings.data.waiting, ...listings.data.decided]) {
      const opened = listing.submittedAt ?? listing.createdAt;
      rows.push({
        kind: "listing",
        itemId: listing.id,
        clock: waitingIds.has(listing.id) ? clockFor(opened, gradeFor("listing", {}), now) : null,
        id: `listing:${listing.id}`,
        /* The real code once it exists, the id-derived stand-in until then. */
        reference: listing.reference ?? shortRef("LST", listing.id),
        type: "Listing",
        icon: "house",
        title: listing.title,
        place: [listing.area, listing.city].filter(Boolean).join(", "),
        detail: t.admin.listings.propertyType[listing.propertyType],
        detailSub: listing.agentName ?? undefined,
        status: listing.status,
        statusLabel: ui.statusLabel(listing.status),
        submitted: ui.when(listing.submittedAt ?? listing.createdAt),
        href: `/admin/listings?q=${encodeURIComponent(listing.title)}`,
        at: listing.submittedAt ?? listing.createdAt,
      });
    }
  }
  if (applications?.state === "ok") {
    const waitingIds = new Set(applications.data.waiting.map((a) => a.id));
    for (const application of [...applications.data.waiting, ...applications.data.decided]) {
      rows.push({
        kind: "application",
        itemId: application.id,
        clock: waitingIds.has(application.id)
          ? clockFor(application.submittedAt ?? application.createdAt, gradeFor("application", {}), now)
          : null,
        id: `application:${application.id}`,
        reference: application.reference,
        type: "Agent",
        icon: "user",
        title: application.fullName ?? application.businessName ?? application.reference,
        place: [application.city, application.stateCode].filter(Boolean).join(", "),
        detail: application.type === "business" ? "Business agent" : "Individual agent",
        detailSub: application.email ?? undefined,
        status: application.status,
        statusLabel: ui.statusLabel(application.status),
        submitted: ui.when(application.submittedAt ?? application.createdAt),
        href: `/admin/agents?q=${encodeURIComponent(application.reference)}`,
        at: application.submittedAt ?? application.createdAt,
      });
    }
  }
  if (reports?.state === "ok") {
    for (const report of reports.data.rows) {
      const open = report.status === "open" || report.status === "reviewing";
      rows.push({
        kind: "report",
        itemId: report.id,
        clock: open ? clockFor(report.createdAt, gradeFor("report", { category: report.category }), now) : null,
        id: `report:${report.id}`,
        reference: shortRef("RPT", report.id),
        type: "Report",
        icon: "flag",
        title: ui.columnLabel("category", report.category),
        sub: report.reporterName,
        detail: ui.columnLabel("targetType", report.targetType),
        detailSub: report.reason,
        status: report.status,
        statusLabel: ui.statusLabel(report.status),
        submitted: ui.when(report.createdAt),
        href: `/admin/reports?q=${encodeURIComponent(report.reason.slice(0, 40))}`,
        at: report.createdAt,
      });
    }
  }
  if (tickets?.state === "ok") {
    for (const ticket of tickets.data.rows) {
      const open = ticket.status === "open" || ticket.status === "pending";
      const spam = open && probablyNotAPerson(ticket);
      rows.push({
        kind: "ticket",
        itemId: ticket.id,
        spam,
        /* Off the clock: a squatter's pitch does not share a promise with people. */
        clock: open && !spam ? clockFor(ticket.createdAt, gradeFor("ticket", { topic: ticket.topic }), now) : null,
        id: `ticket:${ticket.id}`,
        reference: ticket.reference,
        type: "Support",
        icon: "ticket",
        title: ticket.topic ?? "General question",
        sub: ticket.email,
        detail: ticket.name,
        detailSub: ticket.body,
        status: ticket.status,
        statusLabel: ui.statusLabel(ticket.status),
        submitted: ui.when(ticket.createdAt),
        href: `/admin/support?ticket=${ticket.id}`,
        at: ticket.createdAt,
      });
    }
  }
  if (flags?.state === "ok") {
    for (const flag of flags.data.rows) {
      rows.push({
        kind: "flag",
        itemId: flag.id,
        clock: flag.status === "open" ? clockFor(flag.createdAt, gradeFor("flag", { reason: flag.reason }), now) : null,
        id: `flag:${flag.id}`,
        reference: shortRef("FLG", flag.id),
        type: "Message",
        icon: "chat-bubble",
        title: ui.columnLabel("reason", flag.reason),
        sub: flag.matched,
        detail: flag.body,
        status: flag.status,
        statusLabel: ui.statusLabel(flag.status),
        submitted: ui.when(flag.createdAt),
        href: `/admin/flags?q=${encodeURIComponent(flag.matched)}`,
        at: flag.createdAt,
      });
    }
  }
  /* V-89: the desk's own reads, then the lanes, then due-first order. */
  const reads = await loadDesk(
    rows.map((r) => r.itemId),
    rows.filter((r) => r.kind === "report").map((r) => r.itemId),
  );
  for (const row of rows) {
    if (row.kind === "report") row.weight = reportWeight(reads.signals.get(row.itemId) ?? null);
  }
  const claimOf = (row: DeskRow) => {
    const claim = reads.claims.get(`${row.kind}:${row.itemId}`);
    return claim && claimIsLive(claim.touchedAt, now.getTime()) ? claim : null;
  };
  const laned = rows.filter((row) => {
    if (lane === "spam") return row.spam === true;
    if (row.spam) return false;
    if (lane === "late") return row.clock?.overdue === true;
    if (lane === "mine") return claimOf(row)?.claimedBy === reads.me;
    if (lane === "free") return row.clock !== null && claimOf(row) === null;
    return true;
  });
  const spamCount = rows.filter((row) => row.spam).length;
  const clocked = laned
    .filter((r) => r.clock)
    .map((r) => ({ row: r, clock: r.clock as Clock, weight: r.weight?.score ?? 0, openedAt: r.at }))
    .sort(byDue)
    .map((x) => x.row);
  const unclocked = laned.filter((r) => !r.clock).sort((a, b) => b.at.localeCompare(a.at));
  const operatorName = (id: string) => reads.operators.find((o) => o.id === id)?.name ?? desk.someone;
  const keep = { tab: tab === "all" ? "" : tab, q: query.q ?? "", lane: lane === "all" ? "" : lane };
  const hidden = (
    <>
      {keep.tab && <input type="hidden" name="tab" value={keep.tab} />}
      {keep.q && <input type="hidden" name="q" value={keep.q} />}
      {keep.lane && <input type="hidden" name="lane" value={keep.lane} />}
    </>
  );
  const clockLabel = (clock: Clock) =>
    clock.overdue
      ? desk.late.replace("{hours}", String(Math.abs(clock.hoursLeft)))
      : clock.hoursLeft < 1
        ? desk.dueSoon
        : desk.dueIn.replace("{hours}", String(clock.hoursLeft));
  const weightLine = (weight: Weight) =>
    weight.reasons.length === 0
      ? desk.weightFirst
      : weight.reasons
          .map((reason) =>
            reason.kind === "attended"
              ? desk.weightAttended.replace("{date}", formatDate(new Date(reason.at), locale, { day: "numeric", month: "short", timeZone: "Africa/Lagos" }))
              : reason.kind === "phone"
                ? desk.weightPhone
                : desk.weightRecord.replace("{upheld}", String(reason.upheld)).replace("{closed}", String(reason.closed)),
          )
          .join("; ");
  const shown = [...clocked, ...unclocked].slice(0, 40).map((row) => {
    const claim = claimOf(row);
    const key = `${row.kind}:${row.itemId}`;
    return {
      ...row,
      lead: (
        <input
          type="checkbox"
          name="item"
          value={key}
          form="queue-bulk"
          aria-label={desk.select.replace("{ref}", row.reference)}
          className="mr-2xs size-4 shrink-0"
        />
      ),
      extra: (
        <span className="nf-admin-row__sub flex flex-wrap items-center gap-2xs" data-testid="queue-desk-line">
          {row.clock ? (
            <StatusPill tone="warning" size="xs">
              {clockLabel(row.clock)}
            </StatusPill>
          ) : row.spam ? (
            <StatusPill tone="neutral" size="xs">
              {desk.offClock}
            </StatusPill>
          ) : null}
          {claim ? (
            <span>{claim.claimedBy === reads.me ? desk.takenByYou : desk.takenBy.replace("{name}", operatorName(claim.claimedBy))}</span>
          ) : null}
          {row.clock && (!claim || claim.claimedBy === reads.me) && (
            <form action={claim ? releaseRow : takeRow} className="inline">
              <input type="hidden" name="item" value={key} />
              {hidden}
              <button type="submit" className="nf-link-quiet text-[length:var(--nf-text-overline)] text-[var(--nf-content-link)]">
                {claim ? desk.release : desk.take}
              </button>
            </form>
          )}
          {row.weight && <span className="min-w-0 truncate">{weightLine(row.weight)}</span>}
        </span>
      ),
    };
  });

  return (
    <div className="nf-console">
      {/* The one console heading that could not show a count now can: it is
          the same `QueueHeader` the other eighteen desks already use, and the
          total is a real sum of real reads rather than a number typed in. */}
      <ui.QueueHeader title={o.queueTitle} lede={o.queueLede} count={total} />

      <QueueTabs
        label="Queues"
        tabs={TABS.map((entry) => ({
          key: entry.key,
          label: entry.label,
          href: query.q ? `${entry.href}${entry.href.includes("?") ? "&" : "?"}q=${encodeURIComponent(query.q)}` : entry.href,
          count: countFor[entry.key],
          on: entry.key === tab,
        }))}
      />

      <QueueFilters base={tab === "all" ? "/admin/queue" : `/admin/queue?tab=${tab}`} query={query} common={t.admin.common} dateable={false} />

      {/* V-89: lanes. */}
      <QueueTabs
        label={desk.lanesLabel}
        tabs={LANES.map((key) => ({
          key,
          label: desk.lanes[key],
          href: viewHref({ tab: keep.tab || undefined, q: keep.q || undefined, lane: key === "all" ? undefined : key }),
          ...(key === "spam" ? { count: spamCount } : {}),
          on: key === lane,
        }))}
      />
      {lane === "spam" && <p className="nf-caption mt-inline">{desk.spamNote}</p>}

      {(() => {
        const claim = one("claim");
        const bulk = one("bulk");
        const view = one("view");
        const line =
          claim === "taken" ? desk.claimTaken
          : claim === "held" ? desk.claimHeld
          : claim === "released" ? desk.claimReleased
          : claim === "failed" ? desk.claimFailed
          : bulk === "none" ? desk.bulkNone
          : bulk && /^\d+-\d+-\d+$/.test(bulk)
            ? (() => {
                const [done, skipped, failed] = bulk.split("-");
                return desk.bulkDone.replace("{done}", done!).replace("{skipped}", skipped!).replace("{failed}", failed!);
              })()
          : view === "saved" ? desk.viewSaved
          : null;
        return line ? (
          <p role="status" className="nf-body-sm mt-inline text-[var(--nf-content-secondary)]">
            {line}
          </p>
        ) : null;
      })()}

      {/* V-89: decide the selected rows. The boxes on each row belong to this form. */}
      <form id="queue-bulk" action={bulkAct} className="mt-inline flex flex-wrap items-end gap-xs" aria-label={desk.bulkLabel}>
        {hidden}
        <label className="nf-caption flex flex-col gap-3xs">
          {desk.bulkVerb}
          <select name="verb" className="nf-admin-select" defaultValue="take">
            {(Object.keys(desk.verbs) as (keyof typeof desk.verbs)[]).map((verb) => (
              <option key={verb} value={verb}>
                {desk.verbs[verb]}
              </option>
            ))}
          </select>
        </label>
        <label className="nf-caption flex flex-col gap-3xs">
          {desk.bulkReason}
          <select name="reason" className="nf-admin-select" defaultValue="">
            <option value="">-</option>
            {(Object.keys(desk.sendBackReasons) as (keyof typeof desk.sendBackReasons)[]).map((key) => (
              <option key={key} value={key}>
                {desk.sendBackReasons[key].split(".")[0]}
              </option>
            ))}
          </select>
        </label>
        <label className="nf-caption flex flex-col gap-3xs">
          {desk.bulkTo}
          <select name="to" className="nf-admin-select" defaultValue="">
            <option value="">-</option>
            {reads.operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.name ?? desk.someone}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="nf-btn nf-btn--glass nf-btn--sm">
          {desk.bulkApply}
        </button>
      </form>

      {shown.length === 0 ? (
        <ui.QueueEmpty
          title={query.q ? t.admin.common.noMatchTitle : "Nothing waiting across these queues"}
          body={query.q ? t.admin.common.noMatchBody : "A listing submitted, an agent application, a report, a support ticket or a flagged message lands here the moment it arrives."}
          state={query.q ? "no-match" : "never"}
        />
      ) : (
        <QueueTable rows={shown} label={o.queueTitle} heads={t.uiCommon.console.table} />
      )}

      <p className="nf-caption mt-inline">
        Showing {shown.length} across {tab === "all" ? "five queues" : "this queue"}, what falls due first at the top. Every View opens the desk that decides it.
      </p>

      {/* V-89: saved views, the operator's own and the desk's shared ones. */}
      <section className="mt-block" aria-label={desk.viewsLabel}>
        <p className="nf-overline">{desk.viewsLabel}</p>
        {reads.views.length === 0 ? (
          <p className="nf-caption mt-3xs">{desk.viewsNone}</p>
        ) : (
          <ul className="mt-3xs flex flex-wrap gap-xs">
            {reads.views.map((view) => (
              <li key={view.id} className="flex items-center gap-3xs">
                <Link href={viewHref(view.filters)} className="nf-admin-tab">
                  {view.name}
                  {view.shared && <span className="nf-caption"> ({desk.viewSharedTag})</span>}
                </Link>
                {view.mine && (
                  <form action={deleteView}>
                    <input type="hidden" name="id" value={view.id} />
                    {hidden}
                    <button type="submit" className="nf-link-quiet nf-caption text-[var(--nf-content-link)]">
                      {desk.viewDelete}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <form action={saveView} className="mt-xs flex flex-wrap items-end gap-xs">
          {hidden}
          <label className="nf-caption flex flex-col gap-3xs">
            {desk.viewName}
            <input name="name" maxLength={60} required className="nf-field" />
          </label>
          <label className="nf-caption flex items-center gap-3xs">
            <input type="checkbox" name="shared" /> {desk.viewShared}
          </label>
          <button type="submit" className="nf-btn nf-btn--glass nf-btn--sm">
            {desk.viewSave}
          </button>
        </form>
      </section>

      {/* The queues the table does not fold in, still one tap away. */}
      <ul className="mt-block flex flex-wrap gap-xs">
        {MORE.map((entry) => {
          const count = counts.data[entry.key as keyof typeof counts.data] ?? 0;
          const copy = o.tiles[entry.key as keyof typeof o.tiles];
          return (
            <li key={entry.key}>
              <Link href={entry.href} className="nf-admin-tab">
                <UiIcon name={entry.icon} size={16} />
                {copy.label}
                <span className="nf-admin-tab__count nf-numeric">({count})</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
