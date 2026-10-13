/**
 * THE RULES A PLAN SCREEN KEEPS, AS DATA (north star 14.3 and 15.6, founder
 * directive D21). Pure and client-safe, so they are tested on their own and
 * every plan screen inherits them rather than remembering them.
 *
 * D21, the corrected rule: a plan may be preselected and recommended ONLY
 * when the full charge, the charge date, the renewal terms and the cancel path
 * are all on the same screen, at legible size, without scrolling past the
 * action. `PlanPaywall` puts the four lines directly above its one button in
 * the same sticky foot, so "visible" is a matter of layout; whether they
 * EXIST is this file's question. No four lines, no preselection: the member
 * chooses.
 *
 * Still forbidden, and there is no prop anywhere in this folder that could
 * draw one: a permanent-discount claim, a countdown on anything that is not a
 * real deadline, confetti on a purchase.
 */

/**
 * What happens next, in the member's words. Every line is a MONEY SENTENCE,
 * so it is read from `lib/money/copy.ts` by the caller (Session 2 writes
 * them, request W7-R5) and never composed here.
 */
export type PlanTerms = {
  /** What is charged today, e.g. that nothing is charged during the trial. */
  chargeToday: string;
  /** The exact date and amount of the first charge. */
  chargeOn: string;
  /** How and when it renews. */
  renewal: string;
  /** How to cancel, and that cancelling before the date costs nothing. */
  cancel: string;
};

export function termsComplete(terms: Partial<PlanTerms> | null | undefined): terms is PlanTerms {
  if (!terms) return false;
  return (["chargeToday", "chargeOn", "renewal", "cancel"] as const).every(
    (key) => typeof terms[key] === "string" && terms[key].trim().length > 0,
  );
}

/** The plan to start selected: the recommended one only when D21 allows it. */
export function initialPlan(
  preselectedId: string | null | undefined,
  planIds: readonly string[],
  terms: Partial<PlanTerms> | null | undefined,
): string | null {
  if (!preselectedId || !planIds.includes(preselectedId)) return null;
  return termsComplete(terms) ? preselectedId : null;
}

/**
 * THE THREE STEPS OF A TRIAL (15.6, reference 42's wording model): today,
 * everything unlocked; the day before the end, we remind you; the last day,
 * the trial ends. The reminder step is the honest one most products leave
 * out, so it is computed here, from the server's end date, rather than left
 * to a caller to remember.
 *
 * `endsOn` is the trial's last day as YYYY-MM-DD, from the server. Without
 * one, the dates are null and the timeline says so rather than guessing.
 */
export function trialDates(endsOn: string | null | undefined): { remindOn: string | null; endsOn: string | null } {
  if (!endsOn || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return { remindOn: null, endsOn: null };
  const end = Date.parse(`${endsOn}T12:00:00Z`);
  if (!Number.isFinite(end)) return { remindOn: null, endsOn: null };
  const remind = new Date(end - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { remindOn: remind, endsOn };
}

/** Three to five benefit rows, or the screen is a list, not a promise (14.3). */
export function benefitsInRange(count: number): boolean {
  return count >= 3 && count <= 5;
}
