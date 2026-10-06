

export const RATING_MIN = 1;

export const RATING_MAX = 5;

/** The longest review body we accept. Long enough for a real account of a stay. */
export const BODY_MAX = 1200;

/**
 * What each star actually means, so the rating is a judgement rather than a
 * number the guest has to invent a meaning for.
 */
export const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Disappointing",
  3: "Fine",
  4: "Good",
  5: "Excellent",
};
