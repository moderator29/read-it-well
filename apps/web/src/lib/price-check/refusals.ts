import type { BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * THE NINE REFUSAL STATES, AND THE REFUSAL IS THE FEATURE.
 *
 * ---------------------------------------------------------------------------
 * READ THIS BEFORE TREATING ANY OF THEM AS AN ERROR PATH.
 *
 * On the day Price Check ships the gate refuses ONE HUNDRED PER CENT of per
 * property checks, because all 64 listings on this platform are examples and
 * `is_demo = false` sits inside the comparables predicate. That is the proof
 * the gate works, not a bug to route around, and it means these nine screens
 * ARE the product for as long as it takes real supply to arrive.
 *
 * It also means a refusal has to be a complete experience rather than a dead
 * end. Each one says what the situation is, makes clear the fault is not the
 * reader's, and leaves them somewhere to go, which is the shape
 * `components/app/Unreachable.tsx` already established here. And a refusal
 * plus a notify me hands us a geocoded demand signal telling us exactly where
 * to go and recruit supply: Price Check is the only feature on this platform
 * that is useful in an area where we have nothing.
 *
 * ---------------------------------------------------------------------------
 * THE COPY IS NOT IN THIS FILE, AND THAT IS ON PURPOSE.
 *
 * It is in `packages/i18n` under `priceCheck.refusals.<code>`, in all four
 * locales, because this platform ships four and a refusal screen a Hausa
 * speaker cannot read is a refusal twice over. This file holds the STRUCTURE:
 * which icon, which actions in which order, whether the comparables are still
 * drawn underneath, and whether notify me is offered.
 *
 * `refusals.test.ts` asserts that every code here has copy there, so the two
 * halves cannot drift apart.
 */

export const REFUSAL_CODES = [
  "no_location",
  "no_comparables",
  "too_few_comparables",
  "too_few_sized",
  "wide_dispersion",
  "stale",
  "unsupported_type",
  "unsupported_period",
  "demo_only",
] as const;

export type RefusalCode = (typeof REFUSAL_CODES)[number];

/**
 * What a refusal offers. Every one of these is a real destination in this
 * product; none of them is a placeholder.
 *
 * `registeredFirm` is deliberately not named after the regulated title. The
 * lint gate refuses the word and it is right to: an identifier becomes a test
 * id, a CSS class and eventually a route.
 */
export type RefusalAction =
  | "dropPin"
  | "areaReport"
  | "notifyMe"
  | "showNearby"
  | "registeredFirm"
  | "changePeriod";

export type RefusalSpec = {
  code: RefusalCode;
  icon: BrandIconName;
  /** In order. The first is the full width primary, the rest are quiet. */
  actions: readonly RefusalAction[];
  /**
   * True where the comparables we DID find are still drawn beneath the
   * refusal, labelled as nearby listings and never as an estimate. Showing
   * three listings under "this is not enough to give a figure" is more honest
   * than hiding them, and it is what stops the screen feeling like a wall.
   */
  showsComparables: boolean;
  /**
   * True where the set is drawn as a strip plot instead: one tick per
   * comparable on a price axis, no figure, no range. The reader SEES the
   * disagreement rather than being told about it.
   */
  showsStripPlot: boolean;
};

export const REFUSALS: Readonly<Record<RefusalCode, RefusalSpec>> = {
  /* The address could not be resolved to a point at all, which in this
     product means the pin was never dropped: there is no geocoder in the tree
     and the ladder may be stopped at any rung. */
  no_location: {
    code: "no_location",
    icon: "map-spot",
    actions: ["dropPin", "areaReport"],
    showsComparables: false,
    showsStripPlot: false,
  },
  /* Zero rows at 3,000 m, and real listings do exist elsewhere. */
  no_comparables: {
    code: "no_comparables",
    icon: "home-search",
    actions: ["notifyMe", "areaReport"],
    showsComparables: false,
    showsStripPlot: false,
  },
  /* Between one and four rows at 3,000 m. The ones we found are still shown. */
  too_few_comparables: {
    code: "too_few_comparables",
    icon: "home-search",
    actions: ["showNearby", "notifyMe"],
    showsComparables: true,
    showsStripPlot: false,
  },
  /* Enough rows, fewer than five of them stating a size, and the subject
     stated one. This falls THROUGH to the per-property basis rather than
     refusing, which is what the RPC already does, so its copy usually appears
     as a note beside an answered figure. It is a first class state because
     the sentence it carries is the honest one: we can say what nearby
     properties are asking, we cannot say a price per square metre. */
  too_few_sized: {
    code: "too_few_sized",
    icon: "report-stats",
    actions: ["areaReport"],
    showsComparables: true,
    showsStripPlot: false,
  },
  /* The gate was satisfied and the comparables disagree too much for the
     figure to mean anything. NO NUMBER IS PRINTED. If the honest
     interquartile range spans a factor of three, the honest answer is to
     refuse, not to print a range spanning a factor of three. */
  wide_dispersion: {
    code: "wide_dispersion",
    icon: "chart-growth",
    /* NO NOTIFY ME, deliberately, and it is the one refusal where that needs
       saying. The other three supply refusals are promises we can keep by
       recruiting listings. This one is not: "we will tell you when the
       properties near here agree with each other" is a promise about other
       people's asking prices, and more listings in a genuinely mixed area
       make the spread wider as often as narrower. The screen's answer to
       disagreement is to SHOW the disagreement. */
    actions: ["areaReport"],
    showsComparables: false,
    showsStripPlot: true,
  },
  /* The gate was satisfied and the median comparable is over a year old.
     Naira prices have moved. We would rather say nothing than repeat an old
     figure. */
  stale: {
    code: "stale",
    icon: "clock-expired",
    actions: ["notifyMe", "areaReport"],
    showsComparables: true,
    showsStripPlot: false,
  },
  /* Land, and the commercial venue types. Land is priced by plot, title and
     access, and two plots on the same street can be worth very different
     amounts, which is a limit of the market rather than of our data: more
     listings would not fix it. */
  unsupported_type: {
    code: "unsupported_type",
    icon: "land-plot",
    actions: ["registeredFirm", "areaReport"],
    showsComparables: false,
    showsStripPlot: false,
  },
  /* A monthly or quarterly let. Multiplying a monthly rent by twelve assumes
     twelve months of occupancy nobody promised. */
  unsupported_period: {
    code: "unsupported_period",
    icon: "calendar-clock",
    actions: ["changePeriod", "areaReport"],
    showsComparables: false,
    showsStripPlot: false,
  },
  /* THIS IS THE STATE THE ENTIRE PRODUCT IS IN TODAY. Everything we hold near
     here is an example listing. It is told apart from `no_comparables` by
     `public.comparable_supply_near`, which counts real and example rows
     separately, because the gate's own predicate hides the difference. */
  demo_only: {
    code: "demo_only",
    icon: "seal-pending",
    actions: ["notifyMe", "areaReport"],
    showsComparables: false,
    showsStripPlot: false,
  },
} as const;

/** Notify me is offered wherever more supply would change the answer. */
export function offersNotifyMe(code: RefusalCode): boolean {
  return REFUSALS[code].actions.includes("notifyMe");
}

/**
 * The refusals that carry no notify me, and a sentence for each, because
 * "which ones offer it" is a product decision somebody will want to revisit
 * and a list with no reasons beside it invites the wrong revision.
 *
 *   no_location         a missing pin is the reader's own next tap, not our
 *                       supply problem. Telling them we will write to them
 *                       when they have dropped it would be absurd.
 *   unsupported_type    land stays land. Two plots on the same street can be
 *                       worth very different amounts whatever our density is.
 *   unsupported_period  a monthly let stays monthly.
 *   wide_dispersion     more listings in a genuinely mixed area widen the
 *                       spread as often as they narrow it, so this is a
 *                       promise about other people's asking prices.
 *   too_few_sized       its natural home is a NOTE beside an answered figure
 *                       rather than a screen of its own, and offering to tell
 *                       somebody when we can answer, under an answer, is
 *                       nonsense. The gap it names is size coverage on
 *                       listings, which the wizard closes and recruitment
 *                       does not.
 */
export const NOT_A_SUPPLY_PROBLEM: readonly RefusalCode[] = REFUSAL_CODES.filter(
  (code) => !offersNotifyMe(code),
);
