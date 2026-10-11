import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { PartySide, RecordEvent } from "./version-register";
import { momentLabel } from "./term-words";
import "./agreements.css";

type Copy = Dictionary["experienceMoney"]["agreements"];

/** `deal_agreement_events.action`, as the person reads it (moved here from the page, unchanged). */
export const EVENT_LABEL: Record<string, string> = {
  opened: "Drawn up",
  confirmed: "Confirmed",
  amended: "Terms changed",
  submitted: "Sent to Vallo for review",
  released: "Its inspection was used for a new agreement",
  approved: "Approved by Vallo",
  rejected: "Sent back by Vallo",
  cancelled: "Cancelled",
  paid: "Paid",
};

/**
 * D73: a stay's agreement (a booking at a price the business fixed) is never
 * drawn as a staff review, so its review events read as the booking being
 * confirmed. Presentation only; a rental keeps the words above.
 */
const STAY_EVENT_LABEL: Record<string, string> = {
  submitted: "Sent to be confirmed",
  approved: "Confirmed",
  rejected: "Not confirmed",
};

/** An event in words for this agreement's kind. */
export function eventLabel(action: string, kind?: string | null): string {
  if (kind && kind !== "rent" && STAY_EVENT_LABEL[action]) return STAY_EVENT_LABEL[action]!;
  return EVENT_LABEL[action] ?? action;
}

/** The events that name a version worth printing beside them. */
const VERSIONED = new Set(["opened", "confirmed", "amended", "submitted", "approved", "rejected"]);

/** The mark beside an event, in StatusChip's shape grammar: a stop is a square. */
function markOf(action: string): "stop" | "decision" | "step" {
  if (action === "rejected" || action === "cancelled") return "stop";
  if (action === "approved" || action === "paid") return "decision";
  return "step";
}

/**
 * M2: THE AGREEMENT'S HISTORY AS A DATED RECORD.
 *
 * What used to be a run of "date: action" lines is the documented exchange
 * between the two sides and Vallo: each moment dated on Lagos time, who did
 * it (a party by name; a review decision's words already say Vallo, and
 * nobody is named when the record does not say), the version it concerned,
 * and the note the record keeps. Oldest first, the way a file is read.
 *
 * `events` is the sided read (`record-read.ts`) when it succeeded, otherwise
 * the page's own events with no actor and no version, so the history never
 * disappears because the richer read failed.
 *
 * Server-safe. The first six rows rise in on the list stagger (40ms apart,
 * 12px), and nothing else moves.
 */
export function AgreementHistory({
  events,
  names,
  locale,
  copy,
  kind,
}: {
  events: readonly RecordEvent[];
  names: Record<PartySide, string>;
  locale: Locale;
  copy: Copy;
  /** The agreement's kind; a stay's review events are worded as confirmation (D73). */
  kind?: string | null;
}) {
  return (
    <ol className="nf-agr-history" data-testid="agreement-history">
      {events.map((e, i) => {
        /* A party by name. A review decision's own words already say Vallo
           ("Approved by Vallo"), so it carries no second name. */
        const who = e.side === "renter" || e.side === "owner" ? names[e.side] : null;
        const version = e.version !== null && VERSIONED.has(e.action) ? copy.historyVersion.replace("{n}", String(e.version)) : null;
        return (
          <li key={`${e.at}-${i}`} className="nf-agr-history__item" data-mark={markOf(e.action)}>
            <span className="nf-agr-history__mark" aria-hidden="true" />
            <div className="nf-agr-history__body">
              <p className="nf-agr-history__what">
                {eventLabel(e.action, kind)}
                {who ? <span className="nf-agr-history__who"> · {who}</span> : null}
              </p>
              <p className="nf-agr-history__meta">
                <time dateTime={e.at}>{momentLabel(e.at, locale)}</time>
                {version ? <span> · {version}</span> : null}
              </p>
              {e.note ? <p className="nf-agr-history__note">{e.note}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
