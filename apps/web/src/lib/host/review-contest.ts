/**
 * "ASK VALLO TO LOOK AT THIS REVIEW" (C4, 30 September 2026): the published
 * criteria, in one place, so the host's form, the database's check
 * (`review_contests_criterion_chk`) and the staff decision all read the same
 * five reasons.
 *
 * A contest is a request, not a takedown. The review stays up while it is
 * looked at, because a lister who could hide a review by asking would make
 * every bad review disappear. Staff keep it, or hide it with a public note
 * that says why, and both the host and the guest are told. Nothing is ever
 * deleted. The wording of the criteria is the founder's to confirm.
 */

export const CONTEST_CRITERIA = [
  {
    value: "personal_data",
    label: "Shares personal information",
    hint: "A phone number, an address, a full name or anything else that identifies someone.",
  },
  {
    value: "threats",
    label: "Threats or abuse",
    hint: "Threats, insults, or hate towards a person or a group.",
  },
  {
    value: "not_about_the_stay",
    label: "Not about the stay",
    hint: "It is about something else, such as a different place or a dispute that is not the stay.",
  },
  {
    value: "conflict_of_interest",
    label: "Conflict of interest",
    hint: "Written by a competitor, a relative, or someone paid to write it.",
  },
  {
    value: "off_topic",
    label: "Off topic",
    hint: "Politics, religion, or anything that does not help a guest decide.",
  },
] as const;

export type ContestCriterion = (typeof CONTEST_CRITERIA)[number]["value"];

export const CONTEST_NOTE_MAX = 1000;

export function isContestCriterion(value: unknown): value is ContestCriterion {
  return CONTEST_CRITERIA.some((c) => c.value === value);
}

export function criterionLabel(value: string): string {
  return CONTEST_CRITERIA.find((c) => c.value === value)?.label ?? "Other";
}

/** What the host reads about a contest's state. */
export function contestWords(status: string, publicNote: string | null): string {
  if (status === "open") return "With Vallo. The review stays up while we look.";
  if (status === "hidden") return publicNote ? `Hidden by Vallo: “${publicNote}”` : "Hidden by Vallo.";
  if (status === "kept") return "Vallo looked and kept it: it meets the review standards.";
  if (status === "withdrawn") return "You withdrew the request. The review stays up.";
  return "";
}

/** The rating shown over time only once there are enough reviews to mean something. */
export const RATING_TREND_MIN = 5;

/** Average of the visible ratings, to one decimal, or null with none. */
export function averageRating(ratings: readonly number[]): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
