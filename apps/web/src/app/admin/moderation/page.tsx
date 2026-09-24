import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin, adminRefusal } from "@/lib/admin/guard";
import { getModerationQueue, type ModerationQueue } from "@/lib/admin/moderation-queries";
import { getReports, type ReportView } from "@/lib/admin/queries";
import {
  getHeldEvents,
  getModerationSummary,
  type HeldEvent,
  getReportsByCategory,
  REPORT_CATEGORIES,
  type ReportCategory,
} from "@/lib/admin/reads/moderation";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import { gradeForReportCategory } from "@/lib/trust/standards";
import { adminUi, type AdminUi } from "../_components/ui";
import { fill, type AdminCommon, type AdminCopy } from "../_components/copy";
import { QueueFilters, queueHref, readQueueQuery, type QueueQuery } from "../_components/QueueFilters";
import { ReportDecision } from "../_components/AdminActions";
import { dueChip } from "../_components/due";
import { Badge, Pager } from "../_review/parts";
import { ageShort } from "../_review/metrics";
import { LiveRefresh } from "../_review/LiveRefresh";
import { HoldDecision } from "./HoldDecision";
import { ModerationDesk, type ModerationRow } from "./ModerationDesk";
import "../_review/review.css";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Moderation, 01F7DFC7 panel 1, and the two queues it is made of.
 *
 * REPORTS are what members filed (`reports`, decided with `ReportDecision`,
 * which calls `resolveReport`). HELD items are what the safety scan stopped
 * before anybody saw them: posts, stories, story comments and bios (decided
 * with `HoldDecision`, which calls `decideHeldItem`; the author is notified by
 * the status triggers and a takedown needs a reason they read word for word).
 * Both are one job, so they are one table here; the tabs split them.
 *
 * THE REASON TABS ARE THE REAL CATEGORIES. The render's Abuse, Fraud, Spam,
 * Sexual content and Impersonation are not categories this platform records;
 * the eight in `reports_category_chk` are, so those are the tabs, each
 * narrowing in the query (`getReportsByCategory`), plus "Held by the scan".
 *
 * EVERY FIGURE IS EXACT: `getModerationSummary` (lib/admin/reads/moderation)
 * counts with head-only exact reads and reads its fourteen-day series whole.
 */
const HELD_CAP = 50;

type Tab = "all" | "held" | ReportCategory;

/** Short tab words for the eight reasons; the rows and the breakdown use the full wording. */
const TAB_WORD: Record<(typeof REPORT_CATEGORIES)[number], string> = {
  off_platform_payment: "Payment outside",
  scam: "Scam",
  unsafe: "Unsafe",
  not_as_described: "Not as described",
  unavailable: "Unavailable",
  offensive: "Offensive",
  duplicate: "Duplicate",
  other: "Other",
};

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const access = await requireAdmin();
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const common = t.admin.common;

  if (access.state !== "admin") {
    return (
      <div className="nf-panel nf-panel--card nf-admin-card p-lg">
        <h1 className="text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
          Moderation
        </h1>
        <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
          {adminRefusal(access)}
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const query = readQueueQuery(params);
  const rawTab = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const tab: Tab =
    rawTab === "held" || (REPORT_CATEGORIES as readonly string[]).includes(rawTab ?? "")
      ? (rawTab as Tab)
      : "all";
  const categoryTab = tab !== "all" && tab !== "held";
  const offset = categoryTab ? (query.offset ?? 0) : 0;
  const narrowing = {
    ...(query.q ? { q: query.q } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
  };
  const narrowed = Object.keys(narrowing).length > 0;

  const [summary, reports, held, heldEvents] = await Promise.all([
    getModerationSummary(),
    tab === "held"
      ? null
      : categoryTab
        ? getReportsByCategory(tab as ReportCategory, { ...narrowing, ...(offset ? { offset } : {}) })
        : getReports(narrowing),
    tab === "all" || tab === "held" ? getModerationQueue(narrowing) : null,
    (tab === "all" || tab === "held") && !narrowed ? getHeldEvents() : null,
  ]);

  const reportRows: ReportView[] = reports?.state === "ok" ? reports.data.rows : [];

  const now = nowMs();
  const rows: (ModerationRow & { at: string })[] = [
    ...reportRows.map((report) => reportRow(report, ui, t.admin.reports, common, now)),
    ...(held ? heldRows(held, now) : []),
    ...(heldEvents?.state === "ok" ? heldEvents.data.map((event) => eventRow(event, ui, now)) : []),
  ].sort((a, b) => {
    /* Work still waiting first, oldest first, because the longest wait is the
       one that matters; closed reports after it, newest first. */
    const aClosed = a.status === "resolved" || a.status === "dismissed" || (a.status as string) === "withdrawn";
    const bClosed = b.status === "resolved" || b.status === "dismissed" || (b.status as string) === "withdrawn";
    if (aClosed !== bClosed) return aClosed ? 1 : -1;
    return aClosed ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at);
  });

  const base = "/admin/moderation";
  const withReason = (href: string, key: Tab) =>
    key === "all" ? href : `${href}${href.includes("?") ? "&" : "?"}reason=${key}`;
  const tabHref = (key: Tab) =>
    withReason(queueHref(base, { ...query, offset: undefined } as QueueQuery, {}), key);
  const categoryLabel = (key: string) =>
    key === "uncategorised" ? "No reason chosen" : ui.columnLabel("reportCategory", key);

  return (
    <>
      <LiveRefresh />
      <ModerationDesk
        tabs={[
          { key: "all", label: "All", href: tabHref("all"), on: tab === "all" },
          ...REPORT_CATEGORIES.map((category) => ({
            key: category,
            label: TAB_WORD[category],
            href: tabHref(category),
            on: tab === category,
          })),
          { key: "held", label: "Held by the scan", href: tabHref("held"), on: tab === "held" },
        ]}
        summary={summary.state === "ok" ? summary.data : null}
        categoryLabel={categoryLabel}
        filters={
          <QueueFilters
            base={base}
            query={{ ...query, offset: undefined } as QueueQuery}
            common={common}
            searchLabel="Find a report or held words"
            searchPlaceholder="The reporter's words, or a phrase that was held"
          />
        }
        rows={rows}
        unavailable={reports?.state === "unavailable"}
        empty={
          narrowed
            ? { title: common.noMatchTitle, body: common.noMatchBody }
            : {
                title: "Nothing to moderate",
                body: "No report is open and the safety scan is holding nothing. When either changes it lands here, oldest first.",
                cause:
                  "Members report from any listing, post or profile; the safety scan holds words as they are posted, and the author is told they are being checked.",
                link: { href: "/admin/reports", label: "See every report, including closed ones" },
              }
        }
        notes={
          <>
            {tab === "all" && reports?.state === "ok" && reports.data.full ? (
              <p className="nf-rv-panel__note">
                There are more reports than one page shows. Each reason tab pages through its own.
              </p>
            ) : null}
            {held &&
            (held.posts.length >= HELD_CAP ||
              held.stories.length >= HELD_CAP ||
              held.comments.length >= HELD_CAP ||
              held.bios.length >= HELD_CAP) ? (
              <p className="nf-rv-panel__note" role="status">
                A held section has reached fifty rows, which is as many as this screen reads at once.
                There are more waiting than are shown. Narrow by a phrase or a date to reach them.
              </p>
            ) : null}
          </>
        }
        pager={
          categoryTab && reports?.state === "ok" && (reports.data.full || offset > 0) ? (
            <Pager
              page={Math.floor(offset / QUEUE_PAGE_SIZE) + 1}
              hasNext={reports.data.full}
              hrefFor={(p) =>
                withReason(queueHref(base, query, { offset: (p - 1) * QUEUE_PAGE_SIZE }), tab)
              }
              label="Report pages"
            />
          ) : null
        }
      />
    </>
  );
}

/** Wall-clock time, read once per request, outside render purity rules. */
function nowMs(): number {
  return Date.now();
}

const TARGET_ICON: Record<string, ModerationRow["icon"]> = {
  listing: "house",
  post: "feed",
  user: "user",
  story: "document",
};

function targetHref(report: ReportView): string | null {
  if (report.targetType === "listing") return `/listing/${report.targetId}`;
  if (report.targetType === "post") return `/post/${report.targetId}`;
  if (report.targetType === "story") return `/stories/${report.targetId}`;
  return null;
}

function reportRow(
  report: ReportView,
  ui: AdminUi,
  copy: AdminCopy["reports"],
  common: AdminCommon,
  now: number,
): ModerationRow & { at: string } {
  const closed = report.status === "resolved" || report.status === "dismissed" || (report.status as string) === "withdrawn";
  const href = targetHref(report);
  return {
    id: `report:${report.id}`,
    at: report.createdAt,
    icon: TARGET_ICON[report.targetType] ?? "flag",
    item: ui.columnLabel("reportTarget", report.targetType),
    itemSub: `RPT-${report.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
    reporter: report.reporterName,
    reporterSub: "Member",
    reason: report.category ? ui.columnLabel("reportCategory", report.category) : "No reason chosen",
    age: ageShort(report.createdAt, now) ?? "",
    status: report.status,
    statusLabel: ui.statusLabel(report.status),
    body: (
      <div style={{ display: "grid", gap: "var(--nf-space-xs)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--nf-space-xs)", alignItems: "center" }}>
          {!closed ? (
            (() => {
              const due = dueChip(report.createdAt, gradeForReportCategory(report.category), common);
              return <Badge tone={due.tone}>{due.label}</Badge>;
            })()
          ) : null}
          <span className="nf-rv-table__muted">{ui.when(report.createdAt)}</span>
        </div>
        <p className="nf-rv-msg" style={{ whiteSpace: "pre-wrap", color: "var(--nf-content-primary)" }}>
          {report.reason}
        </p>
        <p className="nf-rv-panel__note">
          {fill(copy.reportedBy, {
            reporter: report.reporterName,
            type: report.targetType,
            id: report.targetId,
          })}
          {href ? (
            <>
              {" "}
              <Link href={href} style={{ color: "var(--nf-content-link)" }}>
                Open what was reported
              </Link>
            </>
          ) : null}
        </p>
        {closed ? (
          <p className="nf-rv-panel__note">
            {fill(copy.closedWhen, { when: ui.when(report.resolvedAt) })}{" "}
            {fill(common.resolvedBy, { who: report.resolvedByName ?? common.someone })}.{" "}
            {common.inAuditLog}
          </p>
        ) : (
          <ReportDecision reportId={report.id} status={report.status} copy={copy} common={common} />
        )}
      </div>
    ),
  };
}

function heldRows(queue: ModerationQueue, now: number): (ModerationRow & { at: string })[] {
  const held = (
    id: string,
    at: string,
    icon: ModerationRow["icon"],
    item: string,
    author: { handle: string | null; label: string | null },
    reason: string | null,
    body: React.ReactNode,
  ): ModerationRow & { at: string } => ({
    id,
    at,
    icon,
    item,
    itemSub: author.handle ? `@${author.handle}` : null,
    reporter: "Safety scan",
    reporterSub: "Automatic",
    reason: reason ? truncate(reason, 60) : "Held by the scan",
    age: ageShort(at, now) ?? "",
    status: "HELD",
    statusLabel: "Held",
    tone: "warning",
    body,
  });

  return [
    ...queue.posts.map((post) =>
      held(
        `post:${post.id}`,
        post.createdAt,
        "feed",
        post.isReply ? "Reply" : "Post",
        post.author,
        post.holdReason,
        <HeldBody
          words={post.body || "This post carries no words, only an attachment."}
          reason={post.holdReason}
          link={{ href: `/post/${post.rootId}`, label: "Open the thread" }}
          decision={<HoldDecision target="post" id={post.id} what="post" />}
          meta={[post.author.label, post.areaName].filter(Boolean).join(", ")}
        />,
      ),
    ),
    ...queue.stories.map((story) =>
      held(
        `story:${story.id}`,
        story.createdAt,
        "document",
        "Story",
        story.author,
        story.holdReason,
        <HeldBody
          words={[story.headline, story.standfirst].filter(Boolean).join("\n\n")}
          reason={story.holdReason}
          link={{ href: `/stories/${story.id}`, label: "Open the story" }}
          decision={<HoldDecision target="story" id={story.id} what="story" />}
          meta={[story.author.label, story.areaName ?? story.placeLabel].filter(Boolean).join(", ")}
        />,
      ),
    ),
    ...queue.comments.map((comment) =>
      held(
        `comment:${comment.id}`,
        comment.createdAt,
        "chat-bubble",
        "Story comment",
        comment.author,
        comment.holdReason,
        <HeldBody
          words={comment.body}
          reason={comment.holdReason}
          link={{ href: `/stories/${comment.storyId}`, label: "Open the story" }}
          decision={<HoldDecision target="comment" id={comment.id} what="comment" />}
          meta={[comment.author.label, comment.storyHeadline].filter(Boolean).join(", ")}
        />,
      ),
    ),
    ...queue.bios.map((bio) =>
      held(
        `bio:${bio.userId}`,
        bio.updatedAt,
        "user",
        "Bio",
        { handle: bio.handle, label: bio.label },
        null,
        <HeldBody
          words={bio.bio || "This bio is empty."}
          reason={null}
          link={{ href: `/u/${bio.handle}`, label: "Open the profile" }}
          decision={<HoldDecision target="bio" id={bio.userId} what="bio" />}
          meta={[bio.label, bio.link ? `Link: ${bio.link}` : null].filter(Boolean).join(", ")}
          note="Taking a bio down empties it. The profile itself stays exactly where it is."
        />,
      ),
    ),
  ];
}

function HeldBody({
  words,
  reason,
  link,
  decision,
  meta,
  note,
}: {
  words: string;
  reason: string | null;
  link: { href: string; label: string };
  decision: React.ReactNode;
  meta: string;
  note?: string;
}) {
  return (
    <div style={{ display: "grid", gap: "var(--nf-space-xs)" }}>
      {meta ? <p className="nf-rv-panel__note">{meta}</p> : null}
      <blockquote
        style={{
          margin: 0,
          paddingLeft: "var(--nf-space-sm)",
          borderLeft: "2px solid var(--nf-border-brand)",
          whiteSpace: "pre-wrap",
          color: "var(--nf-content-primary)",
          fontSize: "var(--nf-text-body-sm)",
        }}
      >
        {words}
      </blockquote>
      {reason ? <p className="nf-rv-msg" style={{ color: "var(--nf-status-pending)" }}>Held because: {reason}</p> : null}
      <p className="nf-rv-panel__note">
        <Link href={link.href} style={{ color: "var(--nf-content-link)" }}>
          {link.label}
        </Link>
      </p>
      {note ? <p className="nf-rv-panel__note">{note}</p> : null}
      {decision}
    </div>
  );
}

/**
 * A held event. It can be read and opened, not decided: Session A's
 * `decideHeldItem` has no event target, so the row says so and names the
 * request (AR-10) rather than offering a button that would do nothing.
 */
function eventRow(event: HeldEvent, ui: AdminUi, now: number): ModerationRow & { at: string } {
  return {
    id: `event:${event.id}`,
    at: event.createdAt,
    icon: "calendar-booking",
    item: "Event",
    itemSub: truncate(event.title, 40),
    reporter: "Safety scan",
    reporterSub: "Automatic",
    reason: event.holdReason ? truncate(event.holdReason, 60) : "Held by the scan",
    age: ageShort(event.createdAt, now) ?? "",
    status: "HELD",
    statusLabel: "Held",
    tone: "warning",
    body: (
      <div style={{ display: "grid", gap: "var(--nf-space-xs)" }}>
        <p className="nf-rv-panel__note">
          {[event.hostName, event.venue, event.startsAt ? ui.when(event.startsAt) : null].filter(Boolean).join(", ")}
        </p>
        <blockquote
          style={{
            margin: 0,
            paddingLeft: "var(--nf-space-sm)",
            borderLeft: "2px solid var(--nf-border-brand)",
            whiteSpace: "pre-wrap",
            color: "var(--nf-content-primary)",
            fontSize: "var(--nf-text-body-sm)",
          }}
        >
          {[event.title, event.blurb].filter(Boolean).join("\n\n")}
        </blockquote>
        {event.holdReason ? (
          <p className="nf-rv-msg" style={{ color: "var(--nf-status-pending)" }}>
            Held because: {event.holdReason}
          </p>
        ) : null}
        <p className="nf-rv-panel__note">
          There is no decision for a held event yet: releasing or removing one needs an action
          Session A has not written (scope request AR-10).
        </p>
      </div>
    ),
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}...` : text;
}

