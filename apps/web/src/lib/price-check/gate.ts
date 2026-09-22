import type { RefusalCode } from "./refusals";
import type {
  ConfidenceBand,
  EstimateBasis,
  GateVerdict,
  ListingPropertyType,
  PriceCheckPropertyType,
  PriceCheckSubject,
  SupplyCensus,
} from "./types";

/**
 * THE GATE, ON THE PRODUCT SIDE.
 *
 * `public.estimate_value` decides whether there is a figure. This module
 * decides WHICH REFUSAL to print when there is not, and whether an answered
 * figure should be withheld anyway. Those are different jobs and they are
 * deliberately in different places: the two refusals below are checked HERE
 * rather than inside the RPC so that the comparables are still available to
 * draw when the figure is withheld.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IN THIS FILE IS A PRODUCT SETTING.
 *
 * Every number below is a floor or a threshold that decides whether we are
 * willing to make a claim, and a threshold a product decision can move is
 * decoration. They are here as named constants so they can be READ, not so
 * they can be tuned. The argument for each is in
 * `docs/research/VALUATION_ENGINE_RESEARCH.md` 3.5 to 3.7, and every one of
 * them should be revisited the first time an area actually clears the gate,
 * because none of them is fitted to a Nigerian observation: there are no
 * Nigerian observations.
 */

/** Below this, the interquartile range is an accident rather than a range. */
export const MINIMUM_COMPARABLES = 5;

/** Metres. Evaluated in order, stopping at the first rung that satisfies the gate. */
export const RADIUS_LADDER = [750, 1500, 3000] as const;

/** Recency, and the hard cut beyond which a row is excluded outright. */
export const RECENCY_DAYS = 365;
export const HARD_AGE_CUT_DAYS = 730;

/**
 * (q3 - q1) / q2, above which no figure is printed at all.
 *
 * A set this scattered produces an honest range spanning a factor of three,
 * and the honest answer to that is to refuse rather than to print it. The
 * reader gets the comparables as a strip plot instead and sees the
 * disagreement for themselves.
 */
export const WIDE_DISPERSION_AT = 0.75;

/** Fifteen is the floor for the word "quite sure". Five can never reach it. */
export const CONFIDENCE_FLOOR_FOR_HIGH = 15;

/**
 * THE FOUR TYPES THIS PRODUCT ANSWERS FOR.
 *
 * Everything else refuses with `unsupported_type`, and the refusal is not an
 * apology. Land is priced by plot, title, access, flooding and setback, and
 * two plots on the same street can be worth very different amounts: that is a
 * limit of the market rather than of our data, and more listings would not fix
 * it. Hotels, shortlets and restaurants are priced per night or per cover and
 * do not belong in a set with an annual tenancy at all.
 *
 * `villa` and `rental` are refused too, and that is the honest reading rather
 * than a gap: `comparable_listings` matches `property_type` EXACTLY, so a
 * villa would only ever be compared with other villas, of which this platform
 * holds too few to clear a gate of five anywhere. Answering for a type we
 * cannot supply is a refusal with extra steps.
 */
export const SUPPORTED_TYPES: readonly PriceCheckPropertyType[] = [
  "apartment",
  "home",
  "shop",
  "office",
];

export function isSupportedType(type: ListingPropertyType): type is PriceCheckPropertyType {
  return (SUPPORTED_TYPES as readonly string[]).includes(type);
}

/**
 * The result the screen renders. One shape with a discriminator, so a caller
 * cannot read a figure off a refusal: there is no figure on the refused
 * branch to read.
 */
export type PriceCheckResult =
  | {
      kind: "answered";
      basis: EstimateBasis;
      /** Integer kobo. `formatMoney` and `Amount` are the only printers. */
      lowMinor: number;
      midMinor: number;
      highMinor: number;
      dispersion: number;
      confidence: ConfidenceBand;
      radiusM: number;
      comparableCount: number;
      medianAgeDays: number;
      medianDistanceM: number;
      comparableIds: string[];
      /**
       * The `too_few_sized` sentence, attached rather than refused.
       *
       * The subject stated a size and the answer still came back per property,
       * which means fewer than five comparables near here state one. The
       * figure is honest; the price per square metre is not available, and
       * saying so is better than silently omitting it.
       */
      sizedShortfall: boolean;
    }
  | {
      kind: "refused";
      code: RefusalCode;
      /** How many we DID find, so "we found 3" is a count and not a guess. */
      comparableCount: number;
      radiusM: number;
      /** Only on `wide_dispersion`, where the spread is the thing being shown. */
      dispersion: number | null;
    };

/**
 * Turn the database's verdict into the screen's.
 *
 * THE ORDER OF THESE CHECKS IS THE WHOLE FUNCTION. A monthly let of an
 * unsupported type has two true refusals and must print the one the reader can
 * act on, so the checks that are about WHAT WAS ASKED come before the checks
 * that are about what we hold, and the checks about what we hold come before
 * the ones about how good the answer is.
 *
 * `verdict` may be null: a subject with no pin never reaches the database at
 * all, and calling the RPC with a null point to find that out would be a round
 * trip to learn something the form already knows.
 */
export function priceCheckOutcome(
  subject: PriceCheckSubject,
  verdict: GateVerdict | null,
  supply: SupplyCensus | null,
): PriceCheckResult {
  const refusal = (code: RefusalCode): PriceCheckResult => ({
    kind: "refused",
    code,
    comparableCount: verdict?.comparableCount ?? 0,
    radiusM: verdict?.radiusM ?? RADIUS_LADDER[RADIUS_LADDER.length - 1]!,
    dispersion: null,
  });

  /* 1. WHAT WAS ASKED. Neither of these is about our supply, so neither
        offers a notify me and neither would be changed by a listing. */
  if (!isSupportedType(subject.propertyType)) return refusal("unsupported_type");
  if (subject.intent === "rent" && subject.rentPeriod !== "year") {
    return refusal("unsupported_period");
  }

  /* 2. WHETHER WE CAN LOOK AT ALL. There is no geocoder in this tree, so a
        missing point is a missing pin and the next action is to drop one. */
  if (subject.lat === null || subject.lng === null) return refusal("no_location");
  if (verdict === null) return refusal("no_location");

  /* 3. WHAT WE HOLD. */
  if (verdict.outcome === "refused") {
    /* `is_demo = false` is inside the comparables predicate, so the RPC
       cannot tell "nothing here" from "nothing here but examples". The census
       can, and printing the wrong one of those two is printing a guess about
       our own data. */
    if (supply && supply.realCount === 0 && supply.demoCount > 0) return refusal("demo_only");

    if (verdict.refusalCode === "too_few_comparables" || verdict.comparableCount > 0) {
      return {
        kind: "refused",
        code: "too_few_comparables",
        comparableCount: verdict.comparableCount,
        radiusM: verdict.radiusM,
        dispersion: null,
      };
    }

    /* Real listings ARE here, they are all over a year old, and the 365 day
       window excluded every one of them. "The nearest listings are over a
       year old" is a different sentence from "there is nothing here", and the
       reader deserves the true one. */
    if (supply && supply.realCount === 0 && supply.staleRealCount > 0) return refusal("stale");

    return refusal("no_comparables");
  }

  /* 4. HOW GOOD THE ANSWER IS. Both of these withhold a figure the gate was
        willing to give, and both are checked here rather than in the RPC so
        the comparables survive to be drawn underneath. */
  const dispersion = verdict.dispersion ?? 0;
  if (dispersion > WIDE_DISPERSION_AT) {
    return {
      kind: "refused",
      code: "wide_dispersion",
      comparableCount: verdict.comparableCount,
      radiusM: verdict.radiusM,
      dispersion,
    };
  }

  if ((verdict.medianAgeDays ?? 0) > RECENCY_DAYS) return refusal("stale");

  /* 5. THE FIGURE. Every field is asserted rather than defaulted: a null here
        would mean the RPC answered without a number, which is not a state it
        has, and quietly printing a zero for it is exactly the invented figure
        this feature exists to refuse. */
  if (
    verdict.lowMinor === null ||
    verdict.midMinor === null ||
    verdict.highMinor === null ||
    verdict.basis === null ||
    verdict.confidence === null
  ) {
    return refusal("no_comparables");
  }

  return {
    kind: "answered",
    basis: verdict.basis,
    lowMinor: verdict.lowMinor,
    midMinor: verdict.midMinor,
    highMinor: verdict.highMinor,
    dispersion,
    confidence: verdict.confidence,
    radiusM: verdict.radiusM,
    comparableCount: verdict.comparableCount,
    medianAgeDays: verdict.medianAgeDays ?? 0,
    medianDistanceM: verdict.medianDistanceM ?? 0,
    comparableIds: verdict.comparableIds,
    sizedShortfall:
      subject.sizeSqm !== null && subject.sizeSqm > 0 && verdict.basis === "per_property",
  };
}

/**
 * The basis line, which is always present and never behind a tap: "based on 9
 * listings within 750 m, published in the last 8 months".
 *
 * Returned as parts rather than a sentence so the four locales can order them
 * themselves. Nothing here rounds a count.
 */
export function basisParts(result: Extract<PriceCheckResult, { kind: "answered" }>): {
  count: number;
  radiusM: number;
  medianAgeDays: number;
  medianDistanceM: number;
} {
  return {
    count: result.comparableCount,
    radiusM: result.radiusM,
    medianAgeDays: result.medianAgeDays,
    medianDistanceM: result.medianDistanceM,
  };
}
