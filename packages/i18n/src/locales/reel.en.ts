/**
 * TRACK M: THE CINEMATIC LANDING BANDS (25 September 2026).
 *
 * The words for the five pieces of the cinema kit on the landing page: the
 * giant kinetic words, the drifting photo columns, the day told sideways, the
 * Truchet band and the film HUD. Kept in their own module, the way the other
 * large features are, so the landing's own block is not rewritten to add
 * them.
 *
 * Every line is a description of something the product does today. The day
 * is a story, not a statistic: nothing here counts people, listings or
 * cities. Anything about money is NOT here; the component reads it from
 * `apps/web/src/lib/money/copy.ts`, which is the one wording on every surface.
 */
export const reelEn = {
  places: {
    overline: "Every kind of place",
    title: "Homes, stays and tables. One account.",
    body: "Rent a flat, buy a house, book a room for the weekend or a table for tonight. One search, one inbox, one set of rules.",
    cta: "Start searching",
  },
  day: {
    overline: "A day on Vallo",
    title: "Scroll through a day.",
    body: "Everything below happens in one app, on one account, from the first search to the last booking.",
    of: "of",
    moments: [
      {
        time: "08:10",
        title: "Search on the way in",
        body: "Area, budget, rooms and the kind of place. Save the search and Vallo tells you when something new fits it.",
      },
      {
        time: "12:40",
        title: "Message the agent",
        body: "One thread for the place, with the listing it is about shown in the conversation. Keep every message on Vallo.",
      },
      {
        time: "16:00",
        title: "Inspect it in person",
        body: "",
      },
      {
        time: "19:30",
        title: "Book a table for tonight",
        body: "Restaurants sit on the Stays side of the same app, booked on the account you already have.",
      },
      {
        time: "21:15",
        title: "Ask the assistant",
        body: "How renting on Vallo works, what happens after an inspection, or what a line in an agreement means, answered in plain words.",
      },
      {
        time: "Friday",
        title: "Book the weekend away",
        body: "Hotels, resorts, shortlets and guest houses, with the dates, the room and the total in one place.",
      },
    ],
  },
  system: {
    overline: "How it holds together",
    title: "Separate pieces. One continuous path.",
    note: "Move your pointer across the pattern.",
  },
  kinetic: {
    label: "What you can find on Vallo",
  },
} as const;
