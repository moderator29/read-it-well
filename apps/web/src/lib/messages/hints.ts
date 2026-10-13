import { marketOf } from "../listings/market";
import type { Listing } from "../listings/types";

/**
 * CHAT HINTS: the one small "You may want to ask" card and the quick reply
 * chips above a renter's composer, in a thread about a listing.
 *
 * DETERMINISTIC AND FREE. Every rule reads a field of the listing the thread
 * is about, so there is no model call, no cost and no wait. A hint names only
 * what the listing leaves out: it never states a fact about the property, and
 * with nothing missing (and a visit already open) there is nothing to show.
 *
 * WHERE IT SHOWS. A listing thread, the renter's side only, on a tenancy or a
 * sale. Never to the lister, never in a direct chat, and no hint is written
 * for stay or table threads (skipped for now: those markets answer their own
 * questions on the stay and table pages).
 *
 * THE FIXED PRIORITY (the first gap is the card; the chips follow it):
 *
 *   1  power      neither the grid nor the backup power is stated
 *   2  water      the water supply is not stated
 *   3  moveIn     no total and no charge is stated (buyCosts for a sale)
 *   4  parking    not stated, on a kind of property that usually has it
 *   5  rules      pets and house rules are not in the lister's description
 *   6  visit      no visit is open yet
 *
 * The `rules` rule reads the lister's description, because a listing has no
 * structured pets or rules field. A description that was not read (`undefined`)
 * is UNKNOWN, not empty, and fires nothing: a gap is only named when the
 * listing is known to leave it out.
 */

export const HINT_KEYS = ["power", "water", "moveIn", "buyCosts", "parking", "rules", "visit"] as const;
export type HintKey = (typeof HINT_KEYS)[number];
/** The keys that are a question about a gap in the listing (everything but the visit). */
export type GapKey = Exclude<HintKey, "visit">;

/** The most chips drawn, the visit chip included. */
export const MAX_CHIPS = 3;

export type HintFacts = Pick<
  Listing,
  | "kind"
  | "intent"
  | "pricePeriod"
  | "priceMinor"
  | "utilities"
  | "moveInCostStated"
  | "cautionDepositMinor"
  | "serviceChargeMinor"
  | "agencyFeeMinor"
  | "legalFeeMinor"
  | "agreementFeeMinor"
  | "purchaseCostStated"
  | "saleAgencyFeeMinor"
  | "saleLegalFeeMinor"
  | "governorsConsentFeeMinor"
  | "stampDutyMinor"
  | "surveyRegistrationFeeMinor"
  | "compound"
  | "parkingSpaces"
  | "amenities"
> & {
  /**
   * The lister's own description. `undefined` means it was not read, which
   * fires no rule; `null` or empty means the lister wrote none.
   */
  description?: string | null | undefined;
};

export type HintContext = {
  /** `conversations.context_kind`. Only "listing" ever shows a hint. */
  contextKind: string | null | undefined;
  /** Which end of the conversation the reader is. Only the renter side sees one. */
  role: "host" | "guest" | null | undefined;
  /** False for a direct chat, which has no listing. */
  listing: HintFacts | null | undefined;
  /** An inspection is open on this thread. */
  visitOpen: boolean;
};

export type ChatHints = {
  /** The one card, or null. */
  hint: HintKey | null;
  /** Up to MAX_CHIPS, in the order they are drawn. */
  chips: HintKey[];
};

const NONE: ChatHints = { hint: null, chips: [] };

/** Kinds of property that usually come with somewhere to park. */
const PARKING_USUAL: ReadonlySet<string> = new Set(["home", "rental", "apartment", "villa", "office", "shop"]);

/** Words that mean the lister has said something about pets or house rules. */
const RULES_WORDS = /\b(pets?|dogs?|cats?|smok\w*|house rules?|rules?|noise|visitors?|sublet\w*|curfew|no parties|parties)\b/i;

const stated = (value: unknown): boolean => value !== undefined && value !== null;

/** The market this hint is written for, or null for a stay, a table or an experience. */
function hintMarket(listing: HintFacts): "tenancy" | "sale" | null {
  const market = marketOf({
    kind: listing.kind,
    intent: listing.intent,
    pricePeriod: listing.pricePeriod,
    priceMinor: listing.priceMinor,
  });
  return market === "tenancy" || market === "sale" ? market : null;
}

/** Whether a hint may be drawn at all in this thread. */
export function hintsApply(context: HintContext): boolean {
  if (context.contextKind !== "listing") return false;
  if (context.role !== "guest") return false;
  if (!context.listing) return false;
  return hintMarket(context.listing) !== null;
}

/** The gaps in the listing's own data, in priority order. The visit is not one of them. */
export function listingGaps(listing: HintFacts): GapKey[] {
  const market = hintMarket(listing);
  if (!market) return [];
  const gaps: GapKey[] = [];
  const u = listing.utilities;

  if (!stated(u?.powerGrid) || !stated(u?.powerBackup)) gaps.push("power");
  if (!stated(u?.waterSupply)) gaps.push("water");

  if (market === "tenancy") {
    const anyCharge =
      listing.moveInCostStated === true ||
      [
        listing.cautionDepositMinor,
        listing.serviceChargeMinor,
        listing.agencyFeeMinor,
        listing.legalFeeMinor,
        listing.agreementFeeMinor,
      ].some(stated);
    if (!anyCharge) gaps.push("moveIn");
  } else {
    const anyCost =
      listing.purchaseCostStated === true ||
      [
        listing.saleAgencyFeeMinor,
        listing.saleLegalFeeMinor,
        listing.governorsConsentFeeMinor,
        listing.stampDutyMinor,
        listing.surveyRegistrationFeeMinor,
      ].some(stated);
    if (!anyCost) gaps.push("buyCosts");
  }

  if (PARKING_USUAL.has(listing.kind)) {
    const parkingStated =
      stated(listing.compound?.parkingType) ||
      stated(listing.parkingSpaces) ||
      (listing.amenities ?? []).some((code) => /^parking$/i.test(code));
    if (!parkingStated) gaps.push("parking");
  }

  if (market === "tenancy" && listing.description !== undefined) {
    const text = listing.description ?? "";
    if (!RULES_WORDS.test(text)) gaps.push("rules");
  }

  return gaps;
}

/**
 * What to draw, from the gaps and whether a visit is open. The card is the
 * first gap not dismissed, or the visit when nothing is missing and no visit
 * is open. The chips are the visit (when none is open) first, then the gaps in
 * priority order, three at most. Dismissal hides the card only.
 */
export function hintsFromGaps(
  gaps: readonly GapKey[],
  visitOpen: boolean,
  dismissed: ReadonlySet<string> = new Set(),
): ChatHints {
  const open = gaps.filter((key) => !dismissed.has(key));
  const visit = !visitOpen;
  const hint: HintKey | null = open[0] ?? (visit && !dismissed.has("visit") ? "visit" : null);
  const chips: HintKey[] = [...(visit ? (["visit"] as const) : []), ...gaps].slice(0, MAX_CHIPS);
  return { hint, chips };
}

/** What to draw for a thread, from its context. Everything that is not a renter on a listing gets nothing. */
export function chatHintsFor(context: HintContext, dismissed: ReadonlySet<string> = new Set()): ChatHints {
  if (!hintsApply(context)) return NONE;
  return hintsFromGaps(listingGaps(context.listing!), context.visitOpen, dismissed);
}

/* ------------------------------------------------------------ dismissal */

const DISMISS_PREFIX = "vallo_chat_hints_dismissed:";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The hints this reader dismissed in this conversation. Never throws. */
export function readDismissed(conversationId: string, storage: StorageLike | null = browserStorage()): Set<string> {
  try {
    const raw = storage?.getItem(DISMISS_PREFIX + conversationId);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string" && (HINT_KEYS as readonly string[]).includes(v)));
  } catch {
    return new Set();
  }
}

/** Remembers a dismissal for this conversation. Never throws; without storage it lives in memory only. */
export function writeDismissed(
  conversationId: string,
  key: HintKey,
  storage: StorageLike | null = browserStorage(),
): Set<string> {
  const next = readDismissed(conversationId, storage);
  next.add(key);
  try {
    storage?.setItem(DISMISS_PREFIX + conversationId, JSON.stringify([...next]));
  } catch {
    /* Storage unavailable: the dismissal holds for this visit only. */
  }
  return next;
}
