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

/** The five reasons, as the database spells them. Their words are the host's (`experienceHost.reviewCard.criteria`). */
export const CONTEST_CRITERIA = [
  "personal_data",
  "threats",
  "not_about_the_stay",
  "conflict_of_interest",
  "off_topic",
] as const;

export type ContestCriterion = (typeof CONTEST_CRITERIA)[number];

export const CONTEST_NOTE_MAX = 1000;

export function isContestCriterion(value: unknown): value is ContestCriterion {
  return (CONTEST_CRITERIA as readonly unknown[]).includes(value);
}

/**
 * THE STAFF CONSOLE'S AND THE STORED NOTE'S LABEL, ENGLISH BY DECISION.
 *
 * The console reads in English, and the public note staff are offered when
 * hiding a review ("Removed by Vallo: ...", `suggestedPublicNote`) is stored
 * on the review and shown to every reader as written. So this one label stays
 * here, in English; `review-contest.test.ts` holds it equal to the English
 * dictionary's, which is what the host reads.
 */
const STAFF_LABEL: Record<ContestCriterion, string> = {
  personal_data: "Shares personal information",
  threats: "Threats or abuse",
  not_about_the_stay: "Not about the stay",
  conflict_of_interest: "Conflict of interest",
  off_topic: "Off topic",
};

export function criterionLabel(value: string): string {
  return isContestCriterion(value) ? STAFF_LABEL[value] : "Other";
}

/** The host's words for where a contest stands (`experienceHost.reviewCard.contestStatus`). */
export type ContestStatusWords = {
  open: string;
  hiddenWithNote: string;
  hidden: string;
  kept: string;
  withdrawn: string;
};

/** What the host reads about a contest's state. */
export function contestWords(status: string, publicNote: string | null, words: ContestStatusWords): string {
  if (status === "open") return words.open;
  if (status === "hidden") return publicNote ? words.hiddenWithNote.replace("{note}", publicNote) : words.hidden;
  if (status === "kept") return words.kept;
  if (status === "withdrawn") return words.withdrawn;
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
