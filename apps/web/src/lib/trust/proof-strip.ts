import { formatDate, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { Listing } from "@/lib/listings/types";

/**
 * THE PROOF STRIP, AS DATA (V-03).
 *
 * One component draws the dated facts the database holds about a listing: on
 * every card in two lines, and at the top of the listing page in full. This
 * file decides WHICH lines exist and in WHAT ORDER; the component only decides
 * how they look. It is apart from the component for the reason every model in
 * this codebase is: the decisions in it are the claims rule, and a rule that
 * lives inside a `.tsx` file cannot be tested under this vitest config.
 *
 * ---------------------------------------------------------------------------
 * THE ONE LAW: NO LINE WITHOUT ITS TIMESTAMP.
 *
 * Every line below is built from a date the database set when something
 * happened. A null is not a line. It is not a grey cross, it is not "not
 * verified", it is not "pending": it is NOTHING, because a missing check on a
 * screen reads as an accusation and a claims rule cannot print one. So each
 * spec takes the listing's facts and returns either a dated line or `null`,
 * and the strip is the non-null ones in the fixed order. A date that does not
 * parse is treated exactly as a null: a line that would print "Invalid Date"
 * is a line the code cannot prove.
 *
 * ---------------------------------------------------------------------------
 * THE ORDER, AND WHY IT IS FIXED.
 *
 *   1. identity      who stands behind the listing was checked
 *   2. authority     why that person may let this property
 *   3. availability  the owner said it is still available
 *   4. photographs   the pictures were taken at the property
 *   5. renters       what renters who went there found
 *
 * Person, then right, then vacancy, then the pictures, then the witnesses. It
 * never re-sorts by recency or by "strength": a strip whose order moves is a
 * strip a reader has to re-learn on every card, and the moment it sorts by
 * strength it has become a score, which `docs/PRODUCT.md` section 6 forbids.
 *
 * ---------------------------------------------------------------------------
 * LINES WHOSE SOURCE DOES NOT EXIST YET.
 *
 * Two of the five come from work that has not landed: "Owner confirmed
 * available" is V-31 and "Photographed at the property" is V-45. Their inputs
 * are declared here and are simply never filled by today's read, so they never
 * render. When the column exists, the read fills the field and the line
 * appears; nothing in this file or the component changes. "Seen by renters" is
 * V-05's aggregate and follows the same rule.
 *
 * "Identity" today means a member of staff saw the lister's identity document
 * (the first rung of `VERIFICATION_LADDER`, dated by `agent_badges.verified_at`,
 * which is the moment the published badge turned true). When the vNIN rung
 * (V-49) is live the same line says "matched with NIMC" instead, and only then.
 * The two are different claims and the method is carried so they can never be
 * printed as one.
 *
 * ---------------------------------------------------------------------------
 * AN EXAMPLE LISTING HAS NO STRIP. Example listings never carry a trust signal
 * (`types.ts`, `isDemo`), so the model returns no lines for one whatever its
 * row says. The database already refuses the stored trust columns on an
 * example; this is the second lock, for the same reason `verified` has one.
 */

export const PROOF_LINE_ORDER = [
  "identity",
  "credentials",
  "authority",
  "availability",
  "photographs",
  "renters",
] as const;

export type ProofLineKind = (typeof PROOF_LINE_ORDER)[number];

/** How the lister's identity was established. Two claims, never one. */
export type IdentityMethod = "seen" | "nimc";

/**
 * Everything the strip may be built from. Every field is optional, and absent
 * is the ordinary state: most listings will have one line or none.
 */
export type ProofFacts = {
  isDemo: boolean;
  /** When the lister's identity rung passed, and how. */
  identitySeenAt?: string;
  identityMethod?: IdentityMethod;
  /**
   * The listing is a firm's. The identity rung checks a PERSON's government
   * ID, the person who listed it for the firm, never the firm's registration,
   * so the line has to say whose identity it was.
   */
  listedForFirm?: boolean;
  /** V-87: the lister's dated credential checks from the last year. */
  credentials?: {
    kind: CredentialKind;
    number: string;
    company: string | null;
    /** The name as the register shows it; required for LASRERA and ESVARBON. */
    registerName?: string | null;
    checkedAt: string;
  }[];
  /** `listings.ownership_verified_at`: a title document seen in the lister's name. */
  ownershipVerifiedAt?: string;
  /** `listings.mandate_verified_at`: the owner's instruction seen, the owner spoken to. */
  mandateVerifiedAt?: string;
  /** V-31. No column yet, so never filled today. */
  ownerConfirmedAvailableAt?: string;
  /** V-45. No column yet, so never filled today. */
  photographedAt?: string;
  /**
   * V-05: renters who attended an inspection and answered the truth questions.
   * `asListed` is how many of them said the agent AND the flat were as listed.
   * `lastAt` is the most recent answer, which is the line's date.
   */
  renters?: { attended: number; asListed: number; lastAt: string };
};

export type CredentialKind = "lasrera" | "esvarbon" | "cac_director";

export type ProofLine =
  | { kind: "identity"; at: string; method: IdentityMethod; forFirm: boolean }
  | {
      kind: "credentials";
      at: string;
      credential: CredentialKind;
      number: string;
      company: string | null;
      registerName: string | null;
    }
  | { kind: "authority"; at: string; basis: "ownership" | "mandate" }
  | { kind: "availability"; at: string }
  | { kind: "photographs"; at: string }
  | { kind: "renters"; at: string; attended: number; asListed: number };

/** A timestamp the strip may print, or null. Anything unparseable is null. */
export function provableDate(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? value : null;
}

/** The fewest renters whose answers may be counted in public. Matches `listing_truth_summary`. */
export const MIN_PUBLIC_RENTERS = 5;

type Spec = (facts: ProofFacts) => ProofLine | ProofLine[] | null;

/**
 * One spec per line. Each returns null unless its own timestamp is provable.
 * Declared as a record keyed by kind so a sixth line cannot be added without
 * also being given a place in `PROOF_LINE_ORDER`.
 */
const SPECS: Record<ProofLineKind, Spec> = {
  credentials: (f) =>
    (f.credentials ?? [])
      .filter((c) => provableDate(c.checkedAt) !== null && c.number.trim() !== "")
      .filter((c) => c.kind !== "cac_director" || (c.company ?? "").trim() !== "")
      /* A register entry prints only with the name the register shows: a
         number alone says a number exists, not whose it is. */
      .filter((c) => c.kind === "cac_director" || (c.registerName ?? "").trim() !== "")
      .map((c) => ({
        kind: "credentials" as const,
        at: c.checkedAt,
        credential: c.kind,
        number: c.number,
        company: c.company,
        registerName: c.registerName ?? null,
      })),
  identity: (f) => {
    const at = provableDate(f.identitySeenAt);
    return at
      ? { kind: "identity", at, method: f.identityMethod ?? "seen", forFirm: f.listedForFirm === true }
      : null;
  },
  authority: (f) => {
    /* The database refuses both at once (listings_one_supply_proof_chk). If a
       row ever carried both, the title document is the stronger and narrower
       claim and is the one printed; the strip never prints two authorities. */
    const owned = provableDate(f.ownershipVerifiedAt);
    if (owned) return { kind: "authority", at: owned, basis: "ownership" };
    const mandated = provableDate(f.mandateVerifiedAt);
    return mandated ? { kind: "authority", at: mandated, basis: "mandate" } : null;
  },
  availability: (f) => {
    const at = provableDate(f.ownerConfirmedAvailableAt);
    return at ? { kind: "availability", at } : null;
  },
  photographs: (f) => {
    const at = provableDate(f.photographedAt);
    return at ? { kind: "photographs", at } : null;
  },
  renters: (f) => {
    const r = f.renters;
    if (!r) return null;
    const at = provableDate(r.lastAt);
    const attended = Math.trunc(r.attended);
    const asListed = Math.trunc(r.asListed);
    /* Fewer than five witnesses is not a line (one renter's answer must never
       be readable off a listing by the lister who met them; the database view
       refuses it too), and a count that claims more agreeing renters than
       attended is a read fault that must print nothing. */
    if (!at || attended < MIN_PUBLIC_RENTERS || asListed < 0 || asListed > attended) return null;
    return { kind: "renters", at, attended, asListed };
  },
};

/** The strip, in the fixed order, with every null left out. */
export function proofLines(facts: ProofFacts): ProofLine[] {
  if (facts.isDemo) return [];
  const lines: ProofLine[] = [];
  for (const kind of PROOF_LINE_ORDER) {
    const line = SPECS[kind](facts);
    if (Array.isArray(line)) lines.push(...line);
    else if (line) lines.push(line);
  }
  return lines;
}

/** How many lines a card carries. The page carries all of them. */
export const COMPACT_LINES = 2;

/** The card's share of the strip: the first lines, in the same order. */
export function compactProofLines(lines: ProofLine[]): ProofLine[] {
  return lines.slice(0, COMPACT_LINES);
}

/** The facts a mapped listing carries, gathered for the model. */
export function proofFactsOf(listing: Listing): ProofFacts {
  return {
    isDemo: listing.isDemo,
    ...(listing.listerIdentitySeenAt ? { identitySeenAt: listing.listerIdentitySeenAt } : {}),
    ...(listing.listerRole === "firm" ? { listedForFirm: true } : {}),
    ...(listing.ownershipVerifiedAt ? { ownershipVerifiedAt: listing.ownershipVerifiedAt } : {}),
    ...(listing.mandateVerifiedAt ? { mandateVerifiedAt: listing.mandateVerifiedAt } : {}),
    ...(listing.renterTruth ? { renters: listing.renterTruth } : {}),
  };
}

/* ------------------------------------------------------------- the words */

type ProofCopy = Dictionary["trustVisible"]["proof"];

/** A date as the strip prints it: "14 Aug 2026", in the reader's locale. */
export function proofDate(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  });
}

/** The sentence a line prints. One sentence per line, always with its date. */
export function proofLineText(line: ProofLine, copy: ProofCopy, locale: Locale): string {
  const date = proofDate(line.at, locale);
  switch (line.kind) {
    case "identity":
      return (
        line.method === "nimc" ? copy.identityNimc : line.forFirm ? copy.identitySeenFirm : copy.identitySeen
      ).replace("{date}", date);
    case "authority":
      return (line.basis === "ownership" ? copy.ownership : copy.mandate).replace("{date}", date);
    case "credentials": {
      const template =
        line.credential === "lasrera" ? copy.lasrera : line.credential === "esvarbon" ? copy.esvarbon : copy.cacDirector;
      return template
        .replace("{name}", line.registerName ?? "")
        .replace("{number}", line.number)
        .replace("{company}", line.company ?? "")
        .replace("{date}", date);
    }
    case "availability":
      return copy.availability.replace("{date}", date);
    case "photographs":
      return copy.photographs.replace("{date}", date);
    case "renters": {
      const count = formatNumber(line.attended, locale);
      const listed = formatNumber(line.asListed, locale);
      const template = line.asListed === line.attended ? copy.rentersAll : copy.rentersSome;
      /* The public count is dated to the month (the view truncates it), so it
         is printed as a month and never as a day it cannot prove. */
      const month = formatDate(new Date(line.at), locale, { month: "long", year: "numeric", timeZone: "UTC" });
      return template.replace(/\{count\}/g, count).replace("{listed}", listed).replace("{month}", month);
    }
  }
}

/** Which "is / is not" pair explains a line. */
export function proofExplainKey(line: ProofLine): keyof ProofCopy["explain"] {
  switch (line.kind) {
    case "identity":
      return line.method === "nimc" ? "identityNimc" : line.forFirm ? "identityFirm" : "identity";
    case "authority":
      return line.basis;
    case "credentials":
      return "credential";
    default:
      return line.kind;
  }
}
