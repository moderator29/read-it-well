import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { getAuditLog, type AuditRowView } from "@/lib/admin/audit-queries";
import { AUDIT_ENTITY_TYPES, actionLabel, entityTypeLabel } from "@/lib/admin/audit-filter";
import { QUEUE_PAGE_SIZE } from "@/lib/admin/queue-filter";
import {
  queueHref,
  queueNoMatch,
  QueueFilters,
  QueuePager,
  queueNarrowed,
  readQueueQuery,
  type QueueStatusOption,
} from "../_components/QueueFilters";
import { adminUi, type AdminUi } from "../_components/ui";

/*
 * The desk's own words are English constants, exactly as the money desks'
 * rail labels are: `Dictionary["admin"]` is a closed type owned by another
 * scope, and a fifth private copy of console vocabulary is worse than one
 * honest English string until the next dictionary pass. Named in the report.
 */
const COPY = {
  title: "Audit log",
  lede:
    "Every privileged decision and every movement of money, as it was written at the time. Nothing here can be edited or deleted by anyone, including you. Search by an action, a reference or a user id, narrow by target type or by day.",
  emptyTitle: "Nothing has been written yet",
  emptyBody: "The first decision taken in this console, or the first kobo that moves, will appear here.",
  searchLabel: "Search the log",
  searchPlaceholder: "An action like wallet., a reference like rm-wd-, or a user id",
  system: "Processor or schedule",
  detail: "Detail",
  filterByActor: "Everything by this person",
  filterByTarget: "Everything about this target",
  base: "/admin/audit",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: COPY.title, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * The audit log, on the console's one queue frame.
 *
 * Dense rows on purpose: an operator reading a ledger wants twenty lines on a
 * phone screen, not twenty cards. Each row is when, who, what, and which
 * record; the writer's metadata sits behind a native disclosure so a wall of
 * JSON never pushes the next line off the screen and the page ships no
 * client script for it.
 *
 * NEVER MORE THAN THE ROW HOLDS. The actor is a display name; a null actor
 * is the processor or the clock and is labelled so; the target is its type
 * and its id, and the id is a link that narrows the log rather than a link
 * into the record, because this desk reads decisions and does not open
 * wallets.
 */
function AuditRow({ row, ui }: { row: AuditRowView; ui: AdminUi }) {
  const detail = formatDetail(row.metadata);
  return (
    <li className="nf-card p-md">
      <div className="flex flex-wrap items-center gap-xs">
        <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
          {ui.when(row.createdAt)}
        </span>
        <ui.StatusChip label={entityTypeLabel(row.entityType)} tone="neutral" />
      </div>

      <p className="mt-xs break-words text-[var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-primary)]">
        <span className="font-semibold">{actionLabel(row.action)}</span>
        <span className="text-[var(--nf-content-muted)]"> {row.action}</span>
      </p>

      <p className="mt-xs break-words text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
        {row.actorId ? (
          <Link
            href={queueHref(COPY.base, {}, { q: row.actorId })}
            title={COPY.filterByActor}
            className="underline-offset-2 hover:underline"
          >
            {row.actorName ?? row.actorId}
          </Link>
        ) : (
          <span>{COPY.system}</span>
        )}
        {row.entityId && (
          <>
            {" "}
            <span aria-hidden="true">&middot;</span>{" "}
            <Link
              href={queueHref(COPY.base, {}, { q: row.entityId })}
              title={COPY.filterByTarget}
              className="nf-numeric underline-offset-2 hover:underline [overflow-wrap:anywhere]"
            >
              {row.entityId}
            </Link>
          </>
        )}
      </p>

      {detail && (
        <details className="mt-xs">
          <summary className="nf-caption cursor-pointer select-none text-[var(--nf-content-muted)]">
            {COPY.detail}
          </summary>
          <pre className="nf-caption mt-inline-tight overflow-x-auto whitespace-pre-wrap [overflow-wrap:anywhere]">
            {detail}
          </pre>
        </details>
      )}
    </li>
  );
}

/** The writer's bag as readable text, or nothing when the bag is empty. */
function formatDetail(metadata: AuditRowView["metadata"]): string | null {
  if (metadata === null || metadata === undefined) return null;
  if (typeof metadata === "object" && !Array.isArray(metadata) && Object.keys(metadata).length === 0) {
    return null;
  }
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return null;
  }
}

function typeFilters(): readonly QueueStatusOption[] {
  return AUDIT_ENTITY_TYPES.map((type) => ({ value: type.value, label: type.label }));
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const query = readQueueQuery(params);
  const log = await getAuditLog({
    ...(query.q ? { q: query.q } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from ? { from: query.from } : {}),
    ...(query.to ? { to: query.to } : {}),
    ...(query.offset ? { offset: query.offset } : {}),
  });

  if (log.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title={COPY.title} lede={COPY.lede} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const rows = log.data.rows;
  const narrowed = queueNarrowed(query) || (query.offset ?? 0) > 0;
  const noMatch = queueNoMatch(common);

  return (
    <div className="nf-console">
      <ui.QueueHeader title={COPY.title} lede={COPY.lede} />

      <QueueFilters
        base={COPY.base}
        query={query}
        common={common}
        statuses={typeFilters()}
        searchLabel={COPY.searchLabel}
        searchPlaceholder={COPY.searchPlaceholder}
      />

      {rows.length === 0 ? (
        <ui.QueueEmpty
          title={narrowed ? noMatch.title : COPY.emptyTitle}
          body={narrowed ? noMatch.body : COPY.emptyBody}
          state={narrowed ? "no-match" : "never"}
        />
      ) : (
        <ul className="nf-queue-list">
          {rows.map((row) => (
            <AuditRow key={row.id} row={row} ui={ui} />
          ))}
        </ul>
      )}

      <QueuePager
        base={COPY.base}
        query={query}
        pageSize={QUEUE_PAGE_SIZE}
        full={log.data.full}
        count={rows.length}
      />
    </div>
  );
}
