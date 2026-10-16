/**
 * Shots 1 to 12. See README.md for the shape and furniture.mjs for the rules.
 *
 * Every figure here is printed on the screen it stands over: the example
 * villa asks ₦18m a year and totals ₦26.1m to move in, its cost page breaks
 * that into ₦18m rent, ₦4.5m fees and ₦3.6m refundable, and Lagoon Crest
 * Resort is ₦150,000 a night.
 */
export const F = {
  /* 1: the home. The hero's own promise above the rim, the shortlist below it. */
  1: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Homes", lucide: "search", title: "Rent, buy or sell", line: "Property across Nigeria", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "stat", tab: "Saved", label: "On your shortlist", figure: "4", unit: "spaces saved", lucide: "heart" },
    ],
    props: [{ name: "villa", x: 0.04, y: 0.745, size: 215, rot: 7 }],
  },

  /* 2: the listing. What it asks, over the rim; what it costs to move in, under it. */
  2: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Asking", label: "Villa in Maitama", figure: "₦18m", unit: "a year", lucide: "key-round" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "Move-in total", title: "Every fee, added up", lucide: "receipt",
        cells: [["Rent", "₦18m"], ["Move-in total", "₦26.1m"]], foot: "Vallo charges no inspection fee." },
    ],
    props: [{ name: "receipt", rx: 0.05, y: 0.775, size: 220, rot: 9 }],
  },

  /* 3: the cost page. Its own summary row, held up at size over the rim. */
  3: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "cells", tab: "The whole cost", lucide: "receipt-text",
        cells: [["Rent", "₦18m"], ["Fees", "₦4.5m"], ["Refundable", "₦3.6m"]], foot: "Every cost the lister declared, and every one they have not." },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Line by line", lucide: "percent", title: "Agency fee", line: "10.0% of a year’s rent", amount: "₦1,800,000", meta: null },
    ],
    props: [{ name: "coin", x: 0.05, y: 0.79, size: 210, rot: -8 }],
  },
};
