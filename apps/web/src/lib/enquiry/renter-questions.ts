import type { Dictionary } from "@vallo/i18n/core";
import type { Listing } from "../listings/types";
import type { QuickReply } from "./quick-replies";

/**
 * B6: THE RENTER'S QUESTION CHIPS. The questions Nigerian renters actually
 * send on a first message, as chips above the composer, worded once.
 *
 * A QUESTION THE LISTING ALREADY ANSWERS IS LEFT OUT. Asking what the listing
 * states makes a renter look careless to the agent, and the chip that is
 * missing quietly teaches what the page already says:
 *
 *   caution   out when the lister stated there is no caution (zero), or the
 *             lister's caution record is on the listing;
 *   term      out when the lister stated the shortest tenancy, or the rent is
 *             monthly;
 *   water     out when the water supply is answered;
 *   meter     out when the prepaid meter question is answered;
 *   power     out when the backup power is answered;
 *   service   out when a service charge figure or its terms are stated;
 *   viewing   out when the lister has open viewing slots, which the renter
 *             books on the listing instead.
 *
 * "Still available?" is always first: no listing field can answer it.
 * Never more than five chips. A sale listing gets only the questions that
 * apply to a sale.
 */

type Copy = Dictionary["memberKit"]["questions"];

export type RenterQuestionFacts = Pick<
  Listing,
  "intent" | "pricePeriod" | "cautionDepositMinor" | "serviceChargeMinor" | "minimumTenancyMonths" | "utilities" | "service"
>;

export type RenterQuestionContext = {
  /** The lister's caution record prints on the listing (V-36). */
  cautionRecord?: boolean;
  /** The lister has bookable viewing slots (V-94). */
  viewingSlots?: boolean;
};

export const MAX_RENTER_QUESTIONS = 5;

type Key = "available" | "caution" | "term" | "water" | "meter" | "power" | "service" | "viewing";

/** Which questions are still open for this listing, in the order renters ask them. */
export function openQuestionKeys(listing: RenterQuestionFacts | null, context: RenterQuestionContext = {}): Key[] {
  const keys: Key[] = ["available"];
  const sale = listing?.intent === "sale";
  const u = listing?.utilities;
  const stated = (v: unknown) => v !== undefined && v !== null;

  if (!sale) {
    if (!(listing?.cautionDepositMinor === 0) && !context.cautionRecord) keys.push("caution");
    if (!stated(listing?.minimumTenancyMonths) && listing?.pricePeriod !== "month") keys.push("term");
  }
  if (!stated(u?.waterSupply)) keys.push("water");
  if (!stated(u?.prepaidMeter)) keys.push("meter");
  if (!stated(u?.powerBackup)) keys.push("power");
  if (!sale && !stated(listing?.serviceChargeMinor) && !stated(listing?.service)) keys.push("service");
  if (!context.viewingSlots) keys.push("viewing");
  return keys.slice(0, MAX_RENTER_QUESTIONS);
}

/** The chips, worded, in the same shape as the lister's quick replies. */
export function renterQuestions(
  listing: RenterQuestionFacts | null,
  copy: Copy,
  context: RenterQuestionContext = {},
): QuickReply[] {
  return openQuestionKeys(listing, context).map((key) => ({ key: `ask_${key}`, label: copy[key].label, text: copy[key].text }));
}

/** Adds a chip's sentence to whatever is already typed, once. */
export function addQuestion(draft: string, text: string): string {
  const trimmed = draft.trimEnd();
  if (trimmed.includes(text)) return draft;
  return trimmed ? `${trimmed} ${text}` : text;
}

/** Takes a chip's sentence back out of the draft, tidying the space it leaves. */
export function removeQuestion(draft: string, text: string): string {
  if (!draft.includes(text)) return draft;
  return draft.replace(text, "").replace(/\s{2,}/g, " ").trim();
}
