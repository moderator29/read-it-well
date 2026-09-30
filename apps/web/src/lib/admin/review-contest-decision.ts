/**
 * THE STAFF DECISION ON A REVIEW CONTEST (host C4, the staff side). A lister's
 * "Ask Vallo to look at this review" lands on the Reports lane as a report
 * about a review, linked to an open `review_contests` row. Staff with the
 * moderation scope decide it through `public.decide_review_contest`:
 *
 *   keep   the review stays up and keeps counting toward the rating
 *   hide   the review is hidden (never deleted) behind a public note of 1 to
 *          200 characters, and stops counting toward the rating
 *
 * The database is the judge of every rule here (scope, conflict of interest,
 * one decision per contest, the note's length); this module only refuses
 * early what the function would refuse anyway, and says each refusal in a
 * sentence an operator can act on. Pure, so it is tested without a server.
 */
import { criterionLabel } from "@/lib/host/review-contest";

export const CONTEST_PUBLIC_NOTE_MAX = 200;

export type ContestOutcome = "keep" | "hide";

export type ContestDecisionInput = {
  contestId: string;
  outcome: ContestOutcome;
  publicNote?: string | null;
};

export type ContestDecisionCheck =
  | { ok: true; data: { contestId: string; outcome: ContestOutcome; publicNote: string | null } }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function checkContestDecision(input: ContestDecisionInput): ContestDecisionCheck {
  if (!input || typeof input.contestId !== "string" || !UUID.test(input.contestId)) {
    return { ok: false, error: "This request could not be identified. Refresh the queue and try again." };
  }
  if (input.outcome !== "keep" && input.outcome !== "hide") {
    return { ok: false, error: "Choose to keep the review or to hide it." };
  }
  const note = (input.publicNote ?? "").trim();
  if (input.outcome === "hide") {
    if (note.length === 0) {
      return {
        ok: false,
        error: "A hidden review needs a public note, so guests can see why it is not there.",
        fieldErrors: { publicNote: "Write the note guests see in its place." },
      };
    }
    if (note.length > CONTEST_PUBLIC_NOTE_MAX) {
      return {
        ok: false,
        error: `Keep the public note to ${CONTEST_PUBLIC_NOTE_MAX} characters.`,
        fieldErrors: { publicNote: `${note.length} of ${CONTEST_PUBLIC_NOTE_MAX} characters.` },
      };
    }
  }
  return {
    ok: true,
    data: { contestId: input.contestId, outcome: input.outcome, publicNote: input.outcome === "hide" ? note : null },
  };
}

/** The statuses `decide_review_contest` answers with, other than "ok". */
const REFUSALS: Record<string, string> = {
  forbidden: "Deciding a review needs the moderation scope. Nothing was changed.",
  not_found: "That request is no longer there. Refresh the queue to see the current state.",
  already_decided: "Somebody else decided this a moment ago. Refresh the queue to see the current state.",
  bad_outcome: "Choose to keep the review or to hide it.",
  public_note_needed: `A hidden review needs a public note of 1 to ${CONTEST_PUBLIC_NOTE_MAX} characters.`,
  conflict_of_interest: "You wrote this review or list the place it is about, so another moderator has to decide it.",
};

export const CONTEST_SERVICE_DOWN =
  "The console could not reach the platform data just now. Nothing was changed. Please try again.";

/** The sentence for a status the function returned, or null when it succeeded. */
export function contestRefusal(status: unknown): string | null {
  if (status === "ok") return null;
  return (typeof status === "string" && REFUSALS[status]) || CONTEST_SERVICE_DOWN;
}

/** The note offered when hiding, from the reason the lister chose. Staff edit it. */
export function suggestedPublicNote(criterion: string): string {
  return `Removed by Vallo: ${criterionLabel(criterion).toLowerCase()}`;
}
