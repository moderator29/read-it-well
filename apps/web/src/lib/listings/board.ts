import type { Dictionary } from "@vallo/i18n/core";
import { isListingReference } from "./reference";

/**
 * V-08: THE CODE ON THE GATE, AS PURE FUNCTIONS.
 *
 * In Nigeria the most common listing medium is "TO LET" painted on a gate with
 * a phone number, and the phone number is where the agent-fee racket, the fake
 * agent and the off-platform deal begin. The board replaces the number with
 * the listing's code: "TO LET  2 bed flat  on Vallo  VL-7K4MQP". A code
 * survives paint, radio, a shouted conversation, a screenshot and no data, and
 * typed into Vallo it opens the share door (V-07), through sign in, where the
 * move-in total is written down and the first message is recorded.
 *
 * WHAT A BOARD CARRIES, AND WHAT IT CANNOT. `BoardSubject` is the whole input:
 * a code, an intent, a type, a bedroom count and the example flag. There is
 * no field for a phone number, a name, a price or an address, so nothing that
 * draws from it can print one. The board is on the building; it needs no
 * address, and a painted address is a target list.
 *
 * AN EXAMPLE LISTING NEVER HAS A BOARD (the syndication rule: an example is
 * never handed to anything that republishes it), and a listing without a code
 * (not yet published) has nothing to print.
 *
 * THE WHOLE FEATURE IS BEHIND `feature_flags.listing_board`, off, until the
 * founder rules on TO LET boards (FOUNDER question 12).
 */

export type BoardSubject = {
  reference: string | null;
  intent: "rent" | "sale";
  propertyType: string;
  bedrooms: number | null;
  isDemo: boolean;
};

export type BoardVerdict =
  | { state: "ready"; lines: BoardLines }
  | { state: "example" }
  | { state: "no-code" };

export type BoardLines = {
  /** "TO LET" or "FOR SALE". */
  banner: string;
  /** "2 bed flat", "Self contain", "Shop". Never a price, never a place. */
  shape: string;
  /** "on Vallo". */
  onVallo: string;
  /** "VL-7K4MQP". */
  code: string;
};

type Copy = Dictionary["frontDoor"]["board"];

const HOUSES = new Set(["home", "villa"]);
const FLATS = new Set(["apartment", "rental", "shortlet"]);

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** The unit shape, in the words painted on a Lagos gate. */
export function boardShape(subject: BoardSubject, copy: Copy): string {
  const t = subject.propertyType;
  if (t === "shop") return copy.shapes.shop;
  if (t === "office") return copy.shapes.office;
  if (t === "land") return copy.shapes.land;
  const bedrooms = subject.bedrooms;
  if (bedrooms === 0 && FLATS.has(t)) return copy.shapes.studio;
  if (bedrooms !== null && bedrooms > 0) {
    const noun = HOUSES.has(t) ? copy.shapes.house : copy.shapes.flat;
    return fill(copy.shapes.bedrooms, { count: bedrooms, noun });
  }
  return copy.shapes.home;
}

export function boardFor(subject: BoardSubject, copy: Copy): BoardVerdict {
  if (subject.isDemo) return { state: "example" };
  if (!subject.reference || !isListingReference(subject.reference)) return { state: "no-code" };
  return {
    state: "ready",
    lines: {
      banner: subject.intent === "sale" ? copy.forSale : copy.toLet,
      shape: boardShape(subject, copy),
      onVallo: copy.onVallo,
      code: subject.reference,
    },
  };
}
