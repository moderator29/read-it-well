/**
 * THE STEP SETS BEHIND EVERY STATUS TRACK (spec section 14, reference 36).
 *
 * `StatusTrack.tsx` draws; this decides. Each record that moves through stages
 * (an application, an agreement, a support ticket, a viewing) is reduced here
 * to an ordered list of steps, each with a state and, where the record holds
 * one, the instant it happened. Nothing here invents a time: a step whose
 * moment is not stored carries `at: null` and the track prints no time for it.
 *
 * THE FOUR STATES, and what each one means on every track:
 *
 *   done      it happened
 *   current   the step the record is standing on now (the work in hand)
 *   upcoming  still ahead
 *   failed    where the record stopped: refused, cancelled, withdrawn. The
 *             track is not drawn past it.
 *
 * The stay booking keeps its own deriver (`threads/booking-steps.ts`, which is
 * older and tested), and maps onto these states unchanged.
 *
 * Pure, so it is tested rather than trusted.
 */

export type TrackState = "done" | "current" | "upcoming" | "failed";

export type TrackStepModel<K extends string = string> = {
  key: K;
  /** ISO instant (or ISO date), only from a stored event. Null when unknown or not yet. */
  at: string | null;
  state: TrackState;
};

/**
 * The generic rule: `reached` is the index the record is on.
 *
 *   open      everything before it done, it current, after it upcoming
 *   complete  everything up to and including it done
 *   failed    everything before it done, it failed, after it upcoming
 *
 * `reached` of -1 means nothing has started, so every step is upcoming.
 */
export function trackStates(
  total: number,
  reached: number,
  outcome: "open" | "complete" | "failed" = "open",
): TrackState[] {
  const n = Math.max(0, Math.floor(total));
  const at = Math.min(n - 1, Math.floor(reached));
  return Array.from({ length: n }, (_, index): TrackState => {
    if (index < at) return "done";
    if (index > at) return "upcoming";
    if (outcome === "complete") return "done";
    if (outcome === "failed") return "failed";
    return "current";
  });
}

/** Where a track stands, in words, for its accessible name: "Step 2 of 4". */
export function trackPosition(states: readonly TrackState[]): { index: number; total: number } {
  const total = states.length;
  const failed = states.indexOf("failed");
  if (failed >= 0) return { index: failed + 1, total };
  const current = states.indexOf("current");
  if (current >= 0) return { index: current + 1, total };
  const lastDone = states.lastIndexOf("done");
  return { index: lastDone + 1, total };
}

/* ------------------------------------------------------------ application */

export type ApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFO_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type ApplicationStepKey = "submitted" | "review" | "decision";

/**
 * A profile application: submitted, under review, decided. More information
 * requested holds at review, because the review is still open. A refusal or a
 * suspension is the decision step, failed.
 */
export function applicationTrack(input: {
  status: ApplicationStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
}): TrackStepModel<ApplicationStepKey>[] {
  const { status } = input;
  const refused = status === "REJECTED" || status === "SUSPENDED";
  const decided = refused || status === "APPROVED";
  const reached = status === "DRAFT" ? -1 : decided ? 2 : 1;
  const states = trackStates(3, reached, refused ? "failed" : decided ? "complete" : "open");
  return [
    { key: "submitted", at: status === "DRAFT" ? null : input.submittedAt, state: states[0]! },
    { key: "review", at: null, state: states[1]! },
    { key: "decision", at: decided ? input.reviewedAt : null, state: states[2]! },
  ];
}

/* -------------------------------------------------------------- agreement */

export type AgreementStepKey = "drawn" | "confirmed" | "approved" | "paid";

type AgreementEvent = { at: string; action: string };

function lastAt(events: readonly AgreementEvent[], action: string): string | null {
  for (let i = events.length - 1; i >= 0; i -= 1) if (events[i]!.action === action) return events[i]!.at;
  return null;
}

/**
 * A deal agreement: drawn up, both sides confirmed (the moment it went to
 * Vallo), approved by Vallo, paid. Times are the LAST event of each kind,
 * because changed terms send an agreement round again and the latest pass is
 * the one that stands.
 *
 * Sent back by Vallo fails the approval step; a cancellation fails whichever
 * step the agreement was on when it was called off.
 */
export function agreementTrack(input: {
  status: string;
  events: readonly AgreementEvent[];
}): TrackStepModel<AgreementStepKey>[] {
  const { status, events } = input;
  const at = {
    drawn: events.find((e) => e.action === "opened")?.at ?? events[0]?.at ?? null,
    confirmed: lastAt(events, "submitted"),
    approved: lastAt(events, "approved"),
    paid: lastAt(events, "paid"),
  };

  let reached: number;
  let outcome: "open" | "complete" | "failed" = "open";
  switch (status) {
    case "awaiting_parties":
      reached = 1;
      break;
    case "in_review":
      reached = 2;
      break;
    case "approved":
      reached = 3;
      break;
    case "paid":
      reached = 3;
      outcome = "complete";
      break;
    case "rejected":
      reached = 2;
      outcome = "failed";
      break;
    case "cancelled":
      /* Where it stood when it was called off, read from what had happened. */
      reached = at.approved !== null ? 3 : at.confirmed !== null ? 2 : 1;
      outcome = "failed";
      break;
    default:
      reached = 1;
  }
  const states = trackStates(4, reached, outcome);
  const keys: AgreementStepKey[] = ["drawn", "confirmed", "approved", "paid"];
  return keys.map((key, index) => ({
    key,
    /* A step not done carries no time, even if an older pass stamped one:
       an agreement sent back and re-confirmed is not approved yet. */
    at: states[index] === "done" ? at[key] : null,
    state: states[index]!,
  }));
}

/* --------------------------------------------------------- support ticket */

export type TicketStepKey = "filed" | "picked" | "resolved";

/**
 * A support question: filed, with a person, resolved. "With a person" is
 * reached when the ticket is pending or the team has replied, and dated from
 * the team's first reply when there is one. Resolved and closed both finish
 * the track; closed has no resolution time of its own.
 */
export function ticketTrack(input: {
  status: string;
  createdAt: string;
  firstStaffReplyAt: string | null;
  resolvedAt: string | null;
}): TrackStepModel<TicketStepKey>[] {
  const finished = input.status === "resolved" || input.status === "closed";
  const picked = finished || input.status === "pending" || input.firstStaffReplyAt !== null;
  const reached = finished ? 2 : picked ? 2 : 1;
  const states = trackStates(3, reached, finished ? "complete" : "open");
  return [
    { key: "filed", at: input.createdAt, state: states[0]! },
    { key: "picked", at: states[1] === "done" ? input.firstStaffReplyAt : null, state: states[1]! },
    { key: "resolved", at: finished ? input.resolvedAt : null, state: states[2]! },
  ];
}

/* ---------------------------------------------------------------- viewing */

export type ViewingStepKey = "asked" | "agreed" | "visited" | "recorded";

export type ViewingState = "REQUESTED" | "CONFIRMED" | "PROPOSED" | "DECLINED" | "COMPLETED" | "WITHDRAWN";

/**
 * An inspection (a viewing): requested, time agreed, inspected, recorded. The
 * same four rungs `inspections/ladder.ts` already names, with the record's own
 * times: the request's creation, the reply that agreed a time, the agreed
 * slot once the viewing happened. How it went has no stored time of its own.
 *
 * Declined fails the agreeing step (dated by the reply); withdrawn fails
 * whichever step was next.
 */
export function viewingTrack(input: {
  state: ViewingState;
  outcome: string | null;
  createdAt: string;
  respondedAt: string | null;
  slotAt: string | null;
}): TrackStepModel<ViewingStepKey>[] {
  const { state } = input;
  let reached: number;
  let outcome: "open" | "complete" | "failed" = "open";
  switch (state) {
    case "REQUESTED":
    case "PROPOSED":
      reached = 1;
      break;
    case "CONFIRMED":
      reached = 2;
      break;
    case "COMPLETED":
      reached = 3;
      if (input.outcome) outcome = "complete";
      break;
    case "DECLINED":
      reached = 1;
      outcome = "failed";
      break;
    case "WITHDRAWN":
      reached = input.respondedAt !== null && input.slotAt !== null ? 2 : 1;
      outcome = "failed";
      break;
    default:
      reached = 1;
  }
  const states = trackStates(4, reached, outcome);
  return [
    { key: "asked", at: input.createdAt, state: states[0]! },
    {
      key: "agreed",
      at: states[1] === "done" || (state === "DECLINED" && states[1] === "failed") ? input.respondedAt : null,
      state: states[1]!,
    },
    { key: "visited", at: states[2] === "done" ? input.slotAt : null, state: states[2]! },
    { key: "recorded", at: null, state: states[3]! },
  ];
}
