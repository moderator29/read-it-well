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
    props: [{ name: "villa", x: 0.055, y: 0.745, size: 210, rot: 7 }],
    badges: [
      { name: "search", kind: "glyph", rx: 0.055, y: 0.205, size: 140, rot: -6 },
      { name: "hotel", x: 0.05, y: 0.355, size: 150, rot: 5 },
      { name: "map", kind: "glyph", rx: 0.062, y: 0.62, size: 128, rot: 8, tone: "paper" },
    ],
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

  /* 4: the pair's left half. The phone leans in from the right and the hand
     placed "Room booked" card already stands on its rim, so this half takes
     props only, in the open ground down the left. */
  4: {
    props: [{ name: "hotel", x: 0.045, y: 0.70, size: 225, rot: -8 }],
  },

  /* 5: the pair's right half. The phone holds the left of the image, so the
     prop stands in the open right margin, clear of the seam. */
  5: {
    props: [{ name: "restaurant", rx: 0.05, y: 0.70, size: 225, rot: 9 }],
  },

  /* 6: payments. What the page is, over the rim; what comes back, under it. */
  6: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Payments", lucide: "wallet", title: "Paid through Vallo", line: "A record of what has moved", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Refunds", lucide: "undo-2", title: "Refunds come back", line: "To your card or bank account", meta: null },
    ],
    props: [{ name: "pay", x: 0.045, y: 0.775, size: 215, rot: -8 }],
  },

  /* 7: the resort. Its nightly price over the rim, what the stay holds under it. */
  7: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "The stay", label: "Lagoon Crest Resort", figure: "₦150,000", unit: "a night", lucide: "bed-double" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "The rooms", lucide: "building-2", title: "Garden rooms and villas",
        cells: [["Sleeps", "4"], ["Room types", "2"]], foot: "Breakfast by the lagoon, a spa in the house." },
    ],
    props: [{ name: "hotel", rx: 0.05, y: 0.78, size: 215, rot: 8 }],
  },

  /* 8: the assistant. One of its own starter questions over the rim, the
     ground it covers under the phone. */
  8: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "You ask", lucide: "message-circle", title: "Two bedroom in Lekki", line: "under 5m a year", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Assistant", lucide: "sparkles", title: "What it can answer", line: "Rent, buy, stay or a table", line2: "What moving in really costs", meta: null },
    ],
    props: [{ name: "clock", x: 0.045, y: 0.775, size: 210, rot: -7 }],
  },

  /* 9: the shortlist. Why it opens without signal, over the rim; two of its
     own prices side by side, under it. */
  9: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Offline", lucide: "wifi-off", title: "Kept on this phone", line: "Opens without signal", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "cells", tab: "Compare", lucide: "scale", title: "Prices side by side",
        cells: [["For sale", "₦180m"], ["To move in", "₦26.1m"]], foot: "Four places saved, ready to compare." },
    ],
    props: [{ name: "saved-heart", x: 0.045, y: 0.775, size: 215, rot: 7 }],
  },

  /* 10: the restaurant. The room's size over the rim, the table's terms under it. */
  10: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "The table", label: "Harbour Lights Kitchen", figure: "80", unit: "seats", lucide: "utensils-crossed" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "The kitchen", lucide: "clock", title: "Open until 16:00", line: "Seafood, smart casual", line2: "Parking and backup power", meta: null },
    ],
    props: [{ name: "restaurant", rx: 0.05, y: 0.78, size: 215, rot: 8 }],
  },

  /* 11: the featured row. One featured home's rooms over the rim, the one
     above it, with its price, under the phone. */
  11: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "cells", tab: "Featured", lucide: "house", title: "Five bedroom, Asokoro",
        cells: [["Beds", "5"], ["Baths", "5"], ["Size", "420 m²"]], foot: "Size, beds and baths on every card." },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "For sale", lucide: "key-round", title: "Terrace in Karsana", line: "3 beds · 3 baths · 195 m²", amount: "₦95m", meta: null },
    ],
    props: [{ name: "apartment", x: 0.045, y: 0.775, size: 210, rot: -7 }],
  },

  /* 12: verification. How many steps there are, over the rim; the first and
     the last of them, under it. */
  12: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Verification", label: "What a person checks", figure: "4", unit: "steps", lucide: "user-check" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "The steps", lucide: "badge-check", title: "What gets checked",
        cells: [["Step 1", "Identity"], ["Step 4", "In person"]], foot: "A visit or a live video call, recorded." },
    ],
    props: [{ name: "id-check", rx: 0.05, y: 0.78, size: 215, rot: 9 }],
  },
};
