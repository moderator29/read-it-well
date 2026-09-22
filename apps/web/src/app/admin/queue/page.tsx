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
 */

type TabKey = "all" | "listings" | "applications" | "reports" | "tickets" | "flags";

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

  const rows: (QueueRowData & { at: string })[] = [];
  if (listings?.state === "ok") {
    for (const listing of [...listings.data.waiting, ...listings.data.decided]) {
      rows.push({
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
    for (const application of [...applications.data.waiting, ...applications.data.decided]) {
      rows.push({
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
      rows.push({
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
      rows.push({
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
  rows.sort((a, b) => b.at.localeCompare(a.at));
  const shown = rows.slice(0, 40);

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
        Showing {shown.length} of the newest across {tab === "all" ? "five queues" : "this queue"}. Every View opens the desk that decides it.
      </p>

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
