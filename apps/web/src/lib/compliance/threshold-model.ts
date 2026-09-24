/**
 * SCUML item 7, the pure half: report any transaction above N5,000,000 for an
 * individual or N10,000,000 for a corporate to the NFIU within seven days.
 *
 * The monitor and the register are in the database
 * (`20260924174000_scuml_item_7_threshold_reports.sql`); this file is the
 * console's reading of what it returns, and the twin of its thresholds and its
 * due clock, held equal by `threshold-model.test.ts`.
 */

/** The thresholds in kobo. "Above" is strictly greater. Twin of `private.aml_threshold_minor`. */
export const THRESHOLD_MINOR = { individual: 500_000_000, corporate: 1_000_000_000 } as const;
export type PartyClass = keyof typeof THRESHOLD_MINOR;

/** Days from the transaction to the report. Twin of `due_at = occurred_at + 7 days`. */
export const REPORT_WITHIN_DAYS = 7;

export function isAboveThreshold(amountMinor: number, klass: PartyClass): boolean {
  return Number.isSafeInteger(amountMinor) && amountMinor > THRESHOLD_MINOR[klass];
}

export type EventState = "open" | "awaiting_approval" | "closed";

export type ThresholdRow = {
  id: string;
  kind: "single" | "structuring";
  /** Money in to the party or out of it; structuring sums each apart. */
  direction: "in" | "out" | null;
  source: "booking" | "escrow" | "wallet" | null;
  sourceId: string | null;
  amountMinor: number;
  thresholdMinor: number;
  partyId: string;
  partyClass: PartyClass;
  partyName: string | null;
  counterpartyId: string | null;
  counterpartyClass: PartyClass | null;
  counterpartyName: string | null;
  movements: number;
  occurredAt: string;
  dueAt: string;
  state: EventState;
  decision: null | {
    id: string;
    kind: "reported" | "not_reportable";
    reference: string | null;
    reportedOn: string | null;
    note: string | null;
    decidedBy: string;
    decidedAt: string;
    verdict: "approved" | "rejected" | null;
    approvedBy: string | null;
    approvedAt: string | null;
  };
};

const str = (value: unknown): string | null => (typeof value === "string" && value.length > 0 ? value : null);
const int = (value: unknown): number | null => (typeof value === "number" && Number.isSafeInteger(value) ? value : null);
const klass = (value: unknown): PartyClass | null => (value === "individual" || value === "corporate" ? value : null);

/** One row of `public.threshold_lane`, or null when it is not the shape the console expects. */
export function readThresholdRow(raw: unknown): ThresholdRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = str(row.id);
  const kind = row.kind === "single" || row.kind === "structuring" ? row.kind : null;
  const amountMinor = int(row.amount_minor);
  const thresholdMinor = int(row.threshold_minor);
  const partyId = str(row.party_id);
  const partyClass = klass(row.party_class);
  const occurredAt = str(row.occurred_at);
  const dueAt = str(row.due_at);
  const state = row.state === "open" || row.state === "awaiting_approval" || row.state === "closed" ? row.state : null;
  if (!id || !kind || amountMinor === null || thresholdMinor === null || !partyId || !partyClass || !occurredAt || !dueAt || !state) {
    return null;
  }
  const source = row.source === "booking" || row.source === "escrow" || row.source === "wallet" ? row.source : null;
  const decisionId = str(row.decision_id);
  const decisionKind = row.decision === "reported" || row.decision === "not_reportable" ? row.decision : null;
  const decidedBy = str(row.decided_by);
  const decidedAt = str(row.decided_at);
  return {
    id,
    kind,
    direction: row.direction === "in" || row.direction === "out" ? row.direction : null,
    source,
    sourceId: str(row.source_id),
    amountMinor,
    thresholdMinor,
    partyId,
    partyClass,
    partyName: str(row.party_name),
    counterpartyId: str(row.counterparty_id),
    counterpartyClass: klass(row.counterparty_class),
    counterpartyName: str(row.counterparty_name),
    movements: int(row.movements) ?? 1,
    occurredAt,
    dueAt,
    state,
    decision:
      decisionId && decisionKind && decidedBy && decidedAt
        ? {
            id: decisionId,
            kind: decisionKind,
            reference: str(row.external_reference),
            reportedOn: str(row.reported_on),
            note: str(row.decision_note),
            decidedBy,
            decidedAt,
            verdict: row.verdict === "approved" || row.verdict === "rejected" ? row.verdict : null,
            approvedBy: str(row.approved_by),
            approvedAt: str(row.approved_at),
          }
        : null,
  };
}

export type DueClock =
  | { stage: "done" }
  | { stage: "overdue"; days: number }
  | { stage: "1d" | "3d" | "later"; days: number; hours: number };

/**
 * Where an event stands against its seven days. A closed event has no clock.
 * Overdue counts whole days late (at least one); otherwise whole days and
 * hours left, and the stage the staff reminders use: within one day, within
 * three, or later.
 */
export function dueClock(dueAt: string, state: EventState, now: Date = new Date()): DueClock {
  if (state === "closed") return { stage: "done" };
  const ms = new Date(dueAt).getTime() - now.getTime();
  if (!Number.isFinite(ms)) return { stage: "overdue", days: 1 };
  if (ms < 0) return { stage: "overdue", days: Math.max(1, Math.ceil(-ms / 86_400_000)) };
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  const stage = ms <= 86_400_000 ? "1d" : ms <= 3 * 86_400_000 ? "3d" : "later";
  return { stage, days, hours };
}

/** Open and overdue first by how late, then open by due date, then closed. */
export function laneOrder(rows: ThresholdRow[]): ThresholdRow[] {
  const rank = (row: ThresholdRow) => (row.state === "closed" ? 2 : row.state === "awaiting_approval" ? 1 : 0);
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.dueAt.localeCompare(b.dueAt));
}

export type DueCopy = {
  overdue: string;
  overdueOne: string;
  withinHour: string;
  inHours: string;
  inHour: string;
  inDays: string;
  inDay: string;
  done: string;
};

/** The clock in words, with its singulars: "Due in 1 day", "Due within the hour". */
export function dueLabel(clock: DueClock, copy: DueCopy): string {
  if (clock.stage === "done") return copy.done;
  if (clock.stage === "overdue") return clock.days === 1 ? copy.overdueOne : copy.overdue.replace("{days}", String(clock.days));
  if (clock.hours < 1) return copy.withinHour;
  if (clock.hours < 24) return clock.hours === 1 ? copy.inHour : copy.inHours.replace("{hours}", String(clock.hours));
  return clock.days === 1 ? copy.inDay : copy.inDays.replace("{days}", String(clock.days));
}

/** `public.threshold_lane`'s answer: the rows, whether a page was cut, and open monitor faults. */
export type ThresholdLaneAnswer = { rows: ThresholdRow[]; truncated: boolean; monitorFaults: number };

export function readThresholdLaneAnswer(raw: unknown): ThresholdLaneAnswer | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const answer = raw as Record<string, unknown>;
  if (!Array.isArray(answer.rows) || typeof answer.truncated !== "boolean") return null;
  const faults = int(answer.monitor_faults);
  if (faults === null || faults < 0) return null;
  const rows = answer.rows.map(readThresholdRow);
  if (rows.some((row) => row === null)) return null;
  return { rows: laneOrder(rows as ThresholdRow[]), truncated: answer.truncated, monitorFaults: faults };
}
