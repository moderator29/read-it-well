import type { InspectionState } from "./types";

/**
 * THE FOUR TRUTH QUESTIONS (V-05), as data. Client-safe and pure.
 *
 * The eight-item report asks about the condition of the rooms. These four ask
 * whether the LISTING was honest, and they are asked of the one person who
 * just stood in front of the property: the renter who requested the viewing.
 * Every competitor throws that knowledge away.
 *
 * The keys mirror the columns of `public.inspection_truth` in camel case, and
 * the answer values mirror its check constraints exactly, so a form built from
 * this list cannot send a value the table refuses.
 *
 * WHEN THEY OPEN mirrors `private.inspection_truth_open`: the requester, on an
 * inspection the lister accepted (CONFIRMED) or that has closed (COMPLETED),
 * once the agreed time has passed. The database is the authority; this is the
 * polite half, so the screen does not offer a form the insert policy refuses.
 */

export const TRUTH_QUESTIONS = ["agentMatched", "propertyMatched", "available", "offPlatformAsk"] as const;
export type TruthQuestion = (typeof TRUTH_QUESTIONS)[number];

export const TRUTH_ANSWERS = ["yes", "no", "not_sure"] as const;
export type TruthAnswer = (typeof TRUTH_ANSWERS)[number];

export type TruthAnswers = Partial<Record<TruthQuestion, TruthAnswer>>;

/** The table's column for each question. */
export const TRUTH_COLUMN: Record<TruthQuestion, string> = {
  agentMatched: "agent_matched",
  propertyMatched: "property_matched",
  available: "available",
  offPlatformAsk: "off_platform_ask",
};

export function isTruthAnswer(value: unknown): value is TruthAnswer {
  return typeof value === "string" && (TRUTH_ANSWERS as readonly string[]).includes(value);
}

/** All four answered, each with a value the table accepts. */
export function truthComplete(answers: TruthAnswers): answers is Record<TruthQuestion, TruthAnswer> {
  return TRUTH_QUESTIONS.every((q) => isTruthAnswer(answers[q]));
}

/** May this side answer now? The screen's copy of the insert policy. */
export function truthOpen(
  side: "requester" | "lister",
  state: InspectionState,
  slotAt: string | null,
  requestedAt: string,
  now: number,
): boolean {
  if (side !== "requester") return false;
  if (state !== "CONFIRMED" && state !== "COMPLETED") return false;
  const when = Date.parse(slotAt ?? requestedAt);
  return Number.isFinite(when) && when <= now;
}

/** The row the insert sends, with only the four answers and the ids. */
export function truthRow(
  inspectionId: string,
  respondentId: string,
  answers: Record<TruthQuestion, TruthAnswer>,
): Record<string, string> {
  const row: Record<string, string> = { inspection_id: inspectionId, respondent_id: respondentId };
  for (const q of TRUTH_QUESTIONS) row[TRUTH_COLUMN[q]] = answers[q];
  return row;
}
