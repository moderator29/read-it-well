/**
 * Shots 25 to 35. See README.md for the shape and furniture.mjs for the rules.
 *
 * Every figure here is printed on the screen it stands over: room bookings
 * says Vallo's fee is 10% of the charge, the new listing in Yaba asks ₦1.8m
 * to move in on 1 bed and 42 m², the Classic Double is ₦93,500 a night,
 * Jabi Lakeside Grill opens at 17:00, the listing wizard is on step 1 of 8,
 * the agent's plan is Free, the move-in sheet charges 10.0%, 10.0% and 5.0%
 * of a year's rent and holds ₦3,600,000 as caution, and the search found 52
 * properties. The three screens that stand on zeros (the host's arrivals and
 * occupancy, the agent's tiers, the Pro counters) print none of them.
 *
 * 35 is the set's closing image and carries no container at all: the welcome
 * screen, the wordmark and one 3D object.
 */
export const F = {
  /* 25: room bookings. What Vallo takes, over the rim; where the rest goes, under it. */
  25: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Vallo’s fee", label: "Taken from your share", figure: "10%", unit: "of the charge", lucide: "percent" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "Payout", lucide: "landmark", title: "Your share, your bank", line: "Paid by card, after approval", meta: null },
    ],
    props: [{ name: "bank", rx: 0.05, y: 0.775, size: 215, rot: 8 }],
  },

  /* 26: the agent's dashboard, mid-check. No tier, no count: the screen's zeros stay off. */
  26: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "In review", lucide: "clock", title: "Documents with us", line: "The tick clears all at once", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Meanwhile", lucide: "house", title: "Keep listing", line: "Your properties stay live", meta: null },
    ],
    props: [{ name: "verified", x: 0.048, y: 0.755, size: 210, rot: -7 }],
  },

  /* 27: the new row. What it is, over the rim; the first one in it, under the phone. */
  27: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Just listed", lucide: "bell", title: "New listings", line: "Updated as they are published", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "stat", tab: "Example", label: "Mini flat in Yaba", figure: "₦1.8m", unit: "to move in", note: "1 bed · 1 bath · 42 m²", lucide: "house" },
    ],
    props: [{ name: "apartment", x: 0.045, y: 0.765, size: 205, rot: 7 }],
  },

  /* 28: the calendar. The room's standing rate above, the nights you may set below. */
  28: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Classic Double", label: "Flexible with breakfast", figure: "₦93,500", unit: "a night", lucide: "bed-double" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "Edit rate", lucide: "calendar-days", title: "Set it by the night", line: "Fri and Sat, or every night", meta: null },
    ],
    props: [{ name: "calendar-booked", rx: 0.05, y: 0.775, size: 210, rot: 8 }],
  },

  /* 29: restaurants. How a table is booked, over the rim; the first one's door, under it. */
  29: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Reservations", lucide: "utensils", title: "Book a table", line: "The restaurant confirms", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "stat", tab: "Tonight", label: "Jabi Lakeside Grill", figure: "17:00", unit: "opens", note: "Jabi, Abuja · Parking · Backup power", lucide: "clock" },
    ],
    props: [{ name: "restaurant", x: 0.05, y: 0.765, size: 215, rot: -8 }],
  },

  /* 30: the listing wizard. Where you are in it above, what the paste does below. */
  30: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "All steps", label: "Where you are", figure: "Step 1", unit: "of 8", note: "Saved on this device as you type", lucide: "list-checks" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "WhatsApp", lucide: "message-square", title: "We fill it in for you", line: "Nothing is sent to anybody", meta: null },
    ],
    props: [{ name: "checklist", rx: 0.05, y: 0.775, size: 205, rot: 8 }],
  },

  /* 31: Pro. The plan the screen says you are on, and what a plan would add. */
  31: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "stat", tab: "No cost", label: "Your plan", figure: "Free", unit: "current", note: "Everything you use today is included", lucide: "wallet" },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Pro view", lucide: "layout-dashboard", title: "Leads, clients, numbers", line: "Once you hold a plan", meta: null },
    ],
    props: [{ name: "toolbox", x: 0.048, y: 0.765, size: 210, rot: -7 }],
  },

  /* 32: the host's settings. The three businesses as a pill row, the rest of the page below. */
  32: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "counters", tab: "Your businesses",
        items: [["building-2", "Hotel"], ["bed-double", "Apartments"], ["utensils", "Restaurant"]] },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Also here", lucide: "bell", title: "What reaches you", line: "And your assistant", meta: null },
    ],
    props: [{ name: "hotel", x: 0.045, y: 0.765, size: 210, rot: -8 }],
  },

  /* 33: the move-in sheet. The three fees as the sheet states them, and what comes back. */
  33: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "cells", tab: "Fee by fee", lucide: "percent",
        cells: [["Agency fee", "10.0%"], ["Legal fee", "10.0%"], ["Agreement", "5.0%"]], foot: "Every one a share of a year’s rent." },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Refundable", lucide: "shield", title: "Caution deposit", line: "Held against damage", line2: "Returned as agreed", amount: "₦3,600,000", meta: null },
    ],
    props: [{ name: "contract", x: 0.048, y: 0.77, size: 205, rot: -7 }],
  },

  /* 34: every home. What the search found above, how the order is made below. */
  34: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Found", label: "In this search", figure: "52", unit: "properties", lucide: "house" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "How it works", lucide: "list", title: "How the order works", line: "Nobody can pay to be higher.", meta: null },
    ],
    props: [{ name: "map", rx: 0.05, y: 0.775, size: 215, rot: 8 }],
  },

  /* 35: the close. One object beside the welcome screen, and nothing else. */
  35: {
    props: [{ name: "city", x: 0.05, y: 0.78, size: 215, rot: -7 }],
  },
};
