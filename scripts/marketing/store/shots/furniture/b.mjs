/**
 * Shots 13 to 24. See README.md for the shape and furniture.mjs for the rules.
 *
 * Every figure here is printed on the screen it stands over: the rent search
 * finds 40 properties, the filters sheet runs ₦0 to ₦30,000,000+ and ends on
 * "See 52 homes", the stays home counts 69 stays between 16/10/2026 and
 * 19/10/2026 for 2 guests, the premium terrace in Karsana asks ₦95m at
 * 3 beds, 3 baths and 195 m², Grand Vista Hotel has 3 room types, 40 rooms
 * on sale a night and asks ₦85,000 a night, and the host's overview shows a
 * nothing-to-do 0 on an account with 3 businesses.
 */
export const F = {
  /* 13: premium.mjs hand-places the "Payment settled" card against the camera
     and the back button, so this shot takes props only: the keys you are
     handing over, and the workspace's own tools. */
  13: {
    props: [
      { name: "keys", x: 0.045, y: 0.755, size: 215, rot: -8 },
      { name: "toolbox", rx: 0.05, y: 0.785, size: 200, rot: 8 },
    ],
  },

  /* 14: the rent search. Its own count, held up at size over the rim; under
     the phone, the line the screen sets beside it ("Nobody can pay to be
     higher. How it works"). */
  14: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "stat", tab: "Search", label: "Found right now", figure: "40", unit: "properties", lucide: "search" },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "How it works", lucide: "list-ordered", title: "Nobody pays to rank", line: "The order is not for sale", meta: null },
    ],
    props: [{ name: "search", x: 0.045, y: 0.775, size: 205, rot: -7 }],
  },

  /* 15: the thread. No figure on this one: the card over the rim is the
     channel, the card under the phone is the next step the screen offers. */
  15: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "line", tab: "Messages", lucide: "message-square", title: "Talk to the agent", line: "In the app, on the listing", meta: null },
      { side: "left", y: 0.962, anchor: "bottom", kind: "line", tab: "Next step", lucide: "calendar-check", title: "Ask for a viewing", line: "Agree the date in the chat", meta: null },
    ],
    props: [{ name: "local-talks", rx: 0.05, y: 0.775, size: 205, rot: 7 }],
  },

  /* 16: a welcome screen, so one container only, standing clear under the
     phone: the screen's two Yorùbá buttons, and what they say. */
  16: {
    pops: [
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Yorùbá", lucide: "languages", title: "Ṣẹ̀dá àkọ́ọ̀lẹ̀", line: "Create an account", line2: "Wọlé · Sign in", meta: null },
    ],
    props: [{ name: "local-talks", x: 0.05, y: 0.80, size: 200, rot: -7 }],
  },

  /* 17: the price check. Where it is asking, over the rim; what it answers
     with, under the phone. */
  17: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "cells", tab: "The area", lucide: "map-pin",
        cells: [["State", "Lagos"], ["Area", "Lekki"]], foot: "Only the names agents have typed on listings." },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Price check", lucide: "chart-no-axes-column", title: "What they ask nearby", line: "Advertised prices, not guesses", meta: null },
    ],
    props: [{ name: "map", x: 0.045, y: 0.78, size: 210, rot: -6 }],
  },

  /* 18: the stays home. The directory's count over the rim, the dates and
     guests the screen is set to under it. */
  18: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Stays", label: "Across Nigeria", figure: "69", unit: "to explore", lucide: "bed-double" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "Your dates", lucide: "calendar-days",
        cells: [["Check in", "16/10/2026"], ["Check out", "19/10/2026"], ["Guests", "2"]], foot: "Show prices for these dates." },
    ],
    props: [{ name: "calendar-booked", rx: 0.05, y: 0.775, size: 215, rot: 8 }],
  },

  /* 19: the homes for sale. The premium terrace's asking price over the rim,
     the rest of its line under the phone. */
  19: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "stat", tab: "For sale", label: "Terrace in Karsana", figure: "₦95m", unit: "to buy", lucide: "tag" },
      { side: "right", y: 0.962, anchor: "bottom", kind: "cells", tab: "The listing", lucide: "building-2",
        cells: [["Beds", "3"], ["Baths", "3"], ["Size", "195 m²"]], foot: "Karsana, Abuja." },
    ],
    props: [{ name: "buy", x: 0.045, y: 0.775, size: 215, rot: -7 }],
  },

  /* 20: the host's rooms. What is on sale tonight over the rim, the room
     type's own line under the phone. */
  20: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Classic Double", label: "Rooms on sale a night", figure: "40", unit: "rooms", lucide: "bed-double" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "On the shelf", lucide: "layout-grid",
        cells: [["Room types", "3"], ["On sale", "3"], ["Sleeps", "2"]], foot: "Bookable on 64 nights from today." },
    ],
    props: [{ name: "hotel", rx: 0.05, y: 0.775, size: 210, rot: 7 }],
  },

  /* 21: agreements. No numbers on this screen: the order of things over the
     rim, where the money goes under the phone. */
  21: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "line", tab: "Inspection", lucide: "file-check", title: "Payment opens", line: "when the report is in", meta: null },
      { side: "right", y: 0.962, anchor: "bottom", kind: "line", tab: "Your money", lucide: "landmark", title: "Straight to the bank", line: "Owner or agent, same payment", meta: null },
    ],
    props: [{ name: "pay", x: 0.045, y: 0.78, size: 210, rot: -7 }],
  },

  /* 22: the filter sheet. What the filters come to over the rim, the budget
     the screen is set to under the phone. */
  22: {
    pops: [
      { side: "right", at: 0.01, center: true, kind: "stat", tab: "Matches", label: "With these filters", figure: "52", unit: "homes", lucide: "sliders-horizontal" },
      { side: "left", y: 0.962, anchor: "bottom", kind: "cells", tab: "Your budget", lucide: "wallet",
        cells: [["From", "₦0"], ["To", "₦30,000,000+"]], foot: "Or leave it open: no upper limit." },
    ],
    props: [{ name: "checklist", rx: 0.05, y: 0.775, size: 205, rot: 8 }],
  },

  /* 23: the host's overview in the light theme. Its own nothing-to-do 0 over
     the rim, the day's other counters under the phone. */
  23: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "stat", tab: "Today", label: "Needs you today", figure: "0", unit: "jobs", lucide: "sun-medium" },
      { side: "right", y: 0.962, anchor: "bottom", kind: "cells", tab: "14 October", lucide: "layout-grid",
        cells: [["Arriving", "0"], ["Staying", "0"], ["Unread", "0"]], foot: "3 businesses on this account." },
    ],
    props: [{ name: "team", x: 0.045, y: 0.78, size: 205, rot: -6 }],
  },

  /* 24: the stay. What a night costs over the rim, what the room comes with
     under the phone. */
  24: {
    pops: [
      { side: "left", at: 0.01, center: true, kind: "stat", tab: "Stays", label: "Grand Vista Hotel", figure: "₦85,000", unit: "per night", lucide: "bed-double" },
      { side: "right", y: 0.962, anchor: "bottom", kind: "cells", tab: "The stay", lucide: "building-2",
        cells: [["Sleeps", "3"], ["Room types", "3"]], foot: "Air conditioning, elevator, backup power." },
    ],
    props: [{ name: "city", x: 0.045, y: 0.775, size: 215, rot: -7 }],
  },
};
