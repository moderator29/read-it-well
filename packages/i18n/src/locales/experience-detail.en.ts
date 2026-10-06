/**
 * Session 3's copy for space, stay and restaurant detail (W3).
 *
 * One module per owner so nine agents can add strings without editing en.ts
 * at the same time. English only: ha, ig and yo fall back to it through
 * `withFallback` until a translator supplies a line, because an invented
 * translation of a new line is worse than none. Money sentences never live
 * here; they come from `lib/money/copy.ts` (Session 2).
 */
export const experienceDetailEn = {
  /* The space detail's sections, for the anchor row and the InnerNav list. */
  sections: {
    navLabel: "Sections of this space",
    toggle: "Open the list of sections",
    overview: "Overview",
    costs: "Costs",
    amenities: "Amenities",
    trust: "Trust",
    location: "Location",
    reviews: "Reviews",
    details: "The details",
    photos: "Photos",
    walkthrough: "Walkthrough",
    agent: "Who lists it",
  },
  /* The itemised breakdown's quiet second layer. The rows and the total are
     never behind it; only the notes on how the figures are read. */
  breakdown: {
    howRead: "How these figures are read",
    howReadHint: "Who keeps what, and the state's published limits",
  },
  /* Power, water and the meter, as rows marked with the real objects. */
  utilities: {
    prepaidMeter: "Prepaid meter",
    prepaidMeterBody: "You buy units rather than settle a shared bill",
  },
  /* "Why trust this space?": dated facts only, never a tick. */
  trust: {
    title: "Why trust this space?",
    lede: "Each check carries the date it happened. A check that has not happened is not listed here.",
    open: "See every check, with its date",
    inspected: "Inspected by Vallo",
    addressChecked: "Address checked",
    none: "No check on this space carries a date yet. Each one appears here, dated, on the day it happens.",
    noneAction: "Ask the lister a question",
    whoLists: "Who lists it",
  },
  /* What a space that takes no requests says, with no label on it (D24). */
  closed: {
    body: "This space is not taking requests on Vallo. Save a search for {area} and we will tell you when a space there opens for one.",
    action: "More spaces in {area}",
    stayBody: "This stay is not taking bookings on Vallo. Other stays nearby are a tap away.",
    stayAction: "More stays",
    rooms: "These rooms are not taking bookings on Vallo.",
    restaurantBody: "This restaurant is not holding tables on Vallo. Other restaurants nearby are a tap away.",
    restaurantAction: "More restaurants",
  },
  /* The table window picker on a restaurant. */
  window: {
    closedThatDay: "Not seating on this day. Pick another day.",
    /* Today, after the last seating: the restaurant does seat on this weekday,
       the clock has passed its last time. Said apart from "closed". */
    noTimesLeftToday: "No times left today. Pick another day.",
    withinHours: "Times inside the hours this restaurant publishes",
  },
  /* The stay's lead: the nightly rate, then the total for the dates. */
  stay: {
    forDates: "{total} for {nights}",
  },
  /**
   * `/restaurant/[id]`: the sentences the route assembles from a venue's own
   * fields when the venue wrote no description, and the share card's line
   * (Round 3 sweep, C3). `{name}` the venue, `{where}` its area and city,
   * `{cuisine}` the first cuisine it lists.
   */
  restaurant: {
    aboutWhereServes: "{name} is in {where} and serves {cuisine}.",
    aboutWhere: "{name} is in {where}.",
    aboutServes: "{name} serves {cuisine}.",
    aboutName: "{name}.",
    shareWhere: "{name}, {where}. Ask for a table on Vallo.",
    shareName: "{name}. Ask for a table on Vallo.",
  },
};
