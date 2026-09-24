import type { Dictionary } from "@vallo/i18n";

/**
 * SCUML item 6: Suspicious Transaction Reports, the pure half.
 *
 * Shapes the rows `public.str_cases()` and `public.str_register()` return, and
 * turns each database answer into the desk's sentence. The rules (who may
 * approve, what is append-only, the clock) are the database's, in
 * `20260924173000_scuml_item_6_suspicious_transaction_reports.sql`; nothing
 * here decides anything. Staff only: nothing in this file reaches a member.
 */

export const STR_SOURCES = [
  "person",
  "transaction",
  "risk_alert",
  "report",
  "sanctions_hit",
  "pep_review",
  "threshold_report",
] as const;
export type StrSource = (typeof STR_SOURCES)[number];

export const STR_LINK_KINDS = [...STR_SOURCES, "rent_payment", "booking"] as const;
export type StrLinkKind = (typeof STR_LINK_KINDS)[number];

export const STR_STATES = ["open", "awaiting_approval", "to_file", "filed", "not_filed"] as const;
export type StrState = (typeof STR_STATES)[number];

export type StrCase = {
  id: string;
  sourceKind: StrSource;
  sourceId: string;
  subjectId: string | null;
  grounds: string;
  openedBy: string;
  openedAt: string;
  dueAt: string;
  state: StrState;
  overdue: boolean;
  decision: {
    id: string;
    decision: "file" | "no_file";
    reasons: string;
    decidedBy: string;
    decidedAt: string;
    approved: boolean | null;
    approverId: string | null;
  } | null;
  links: { kind: string; ref: string }[];
};

export type StrFiling = {
  caseId: string;
  goamlReference: string;
  filedAt: string;
  recordedBy: string;
  decidedBy: string;
  approverId: string | null;
};

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

export function isStrSource(value: unknown): value is StrSource {
  return typeof value === "string" && (STR_SOURCES as readonly string[]).includes(value);
}

/** One `str_cases()` row, or null when it is not one. */
export function strCaseFrom(row: unknown): StrCase | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = str(r.id);
  const sourceId = str(r.source_id);
  const grounds = str(r.grounds);
  const openedBy = str(r.opened_by);
  const openedAt = str(r.opened_at);
  const dueAt = str(r.due_at);
  const state = r.state;
  if (!id || !sourceId || !grounds || !openedBy || !openedAt || !dueAt) return null;
  if (!isStrSource(r.source_kind)) return null;
  if (typeof state !== "string" || !(STR_STATES as readonly string[]).includes(state)) return null;
  const decisionId = str(r.decision_id);
  const decision =
    decisionId && (r.decision === "file" || r.decision === "no_file") && str(r.reasons) && str(r.decided_by) && str(r.decided_at)
      ? {
          id: decisionId,
          decision: r.decision as "file" | "no_file",
          reasons: r.reasons as string,
          decidedBy: r.decided_by as string,
          decidedAt: r.decided_at as string,
          approved: typeof r.approved === "boolean" ? r.approved : null,
          approverId: str(r.approver_id),
        }
      : null;
  const links = Array.isArray(r.links)
    ? (r.links as unknown[]).flatMap((l) => {
        const o = l as Record<string, unknown> | null;
        return o && typeof o.kind === "string" && typeof o.ref === "string" ? [{ kind: o.kind, ref: o.ref }] : [];
      })
    : [];
  return {
    id,
    sourceKind: r.source_kind,
    sourceId,
    subjectId: str(r.subject_id),
    grounds,
    openedBy,
    openedAt,
    dueAt,
    state: state as StrState,
    overdue: r.overdue === true,
    decision,
    links,
  };
}

/** The rows, or null when the read itself is not a list (a failed read, never "no cases"). */
export function strCasesFrom(data: unknown): StrCase[] | null {
  if (!Array.isArray(data)) return null;
  return data.flatMap((row) => {
    const c = strCaseFrom(row);
    return c ? [c] : [];
  });
}

export function strRegisterFrom(data: unknown): StrFiling[] | null {
  if (!Array.isArray(data)) return null;
  return data.flatMap((row) => {
    const r = row as Record<string, unknown> | null;
    if (!r) return [];
    const caseId = str(r.case_id);
    const goamlReference = str(r.goaml_reference);
    const filedAt = str(r.filed_at);
    const recordedBy = str(r.recorded_by);
    const decidedBy = str(r.decided_by);
    if (!caseId || !goamlReference || !filedAt || !recordedBy || !decidedBy) return [];
    return [{ caseId, goamlReference, filedAt, recordedBy, decidedBy, approverId: str(r.approver_id) }];
  });
}

type Copy = Dictionary["complianceStr"];
type ResultKey = keyof Copy["results"];

/** A database answer (a status string, or `{ status }`), as the desk's sentence. */
export function strResultText(answer: unknown, copy: Copy): { ok: boolean; text: string } {
  const status =
    typeof answer === "string"
      ? answer
      : answer && typeof answer === "object" && typeof (answer as { status?: unknown }).status === "string"
        ? ((answer as { status: string }).status)
        : "failed";
  const good = new Set(["opened", "decided", "approved", "rejected", "recorded", "linked", "held"]);
  const key = (status in copy.results ? status : "failed") as ResultKey;
  if (status === "opened") return { ok: true, text: "" };
  if (status === "held") {
    const until = (answer as { until?: unknown }).until;
    return { ok: true, text: copy.results.held.replace("{until}", typeof until === "string" ? lagosTime(until) : "") };
  }
  return { ok: good.has(status), text: copy.results[key] };
}

/** A Lagos date and time with the weekday; empty for anything unparseable. */
export function lagosTime(iso: string): string {
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  return at.toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** What the next step on a case is, so the desk offers exactly one form. */
export function strNextStep(c: Pick<StrCase, "state">): "decide" | "approve" | "record" | "none" {
  switch (c.state) {
    case "open":
      return "decide";
    case "awaiting_approval":
      return "approve";
    case "to_file":
      return "record";
    default:
      return "none";
  }
}

/** Where "Consider an STR" sends staff from another console screen. */
export function considerStrHref(from: StrSource, id: string, subject?: string | null): string {
  const q = new URLSearchParams({ tab: "str", from, id });
  if (subject) q.set("subject", subject);
  return `/admin/compliance?${q.toString()}`;
}

/** The desk's prefill from the address, or nothing that is not valid. */
export function strPrefill(params: Record<string, string | string[] | undefined>): {
  from: StrSource;
  id: string;
  subject: string;
} {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const from = one("from");
  const clean = (v: string) => (/^[A-Za-z0-9-]{1,200}$/.test(v) ? v : "");
  return { from: isStrSource(from) ? from : "person", id: clean(one("id")), subject: clean(one("subject")) };
}
