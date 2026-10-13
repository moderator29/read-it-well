/**
 * VISIT OPS, in English (13 October 2026): the lister's visit calendar on
 * /agent/inspections and the console's visit calendar on
 * /admin/bookings/visits.
 *
 * Its own module for the reason `member-kit.en.ts` gives: `en.ts` is written
 * by several people in the same hour, and a namespace here costs that file
 * one import and one line. Other locales inherit these through
 * `withFallback` until a speaker writes them.
 *
 * THE CLAIMS RULE applies to every string: each one says what the record
 * holds or what the platform does. Counts go through `countOf` with the
 * `visits` noun. No em dashes.
 */
export const visitOpsEn = {
  /** The chip on a visit row, one word per state. Declined and withdrawn have no filter of their own. */
  states: {
    requested: "Requested",
    proposed: "Proposed",
    confirmed: "Confirmed",
    done: "Done",
    missed: "Missed",
    declined: "Declined",
    withdrawn: "Withdrawn",
  },
  /** How the visit happens (`inspection_requests.visit_mode`). */
  modes: {
    in_person: "In person",
    video: "Video call",
  },

  /** The lister's calendar on /agent/inspections. */
  calendar: {
    summaryLabel: "Your visits at a glance",
    today: "Today",
    next7: "Next 7 days",
    needsAnswer: "Needs your answer",
    needsTitle: "Needs your answer",
    needsNote: "Requests waiting on you. Open one to confirm it, offer another time, or decline.",
    calendarTitle: "Visit calendar",
    viewLabel: "Calendar view",
    week: "Week",
    month: "Month",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    jumpToday: "Today",
    filterLabel: "Show visits that are",
    all: "All",
    weekOf: "Week of {date}",
    dayEmpty: "No visits",
    weekEmpty: "No visits this week.",
    weekEmptyFiltered: "No {state} visits this week.",
    dayPickHint: "Pick a day to see its visits.",
    dayNone: "No visits on {date}.",
    dayNoneFiltered: "No {state} visits on {date}.",
    askedFor: "asked for",
    nameNotShared: "Name not shared",
    listingGone: "Listing taken down",
    visitTitle: "Visit",
    close: "Close",
    windowsTitle: "When you can show",
    noneTitle: "No visit requests yet",
    noneBody:
      "When somebody asks to see one of your homes, the visit lands on this calendar on the day they asked for, and you can confirm it, offer another time, or say no.",
    noneAction: "Your properties",
    readFailed:
      "We could not load your visits just now, so this is not showing you an empty calendar that might not be true. Nothing has been lost. Try again in a moment.",
    shownCap: "Showing your {count} most recent requests, open ones first.",
  },

  /** The console's calendar on /admin/bookings/visits. Read only. */
  admin: {
    title: "Visits",
    /** The way in from the Bookings desk and from Operations > In flight. */
    openCalendar: "Visit calendar",
    lede: "Every viewing on Vallo, on the Lagos day it is for. Read only: nothing here changes a visit.",
    allStays: "All stays",
    unavailable: "The visits could not be read just now. Nothing has changed. Try again in a moment.",
    tooMany: "This range holds more visits than the console reads at once. Narrow it with a filter.",
    viewLabel: "Calendar view",
    week: "Week",
    month: "Month",
    stepLabel: "Move through the calendar",
    previous: "Earlier",
    next: "Later",
    rangeWeek: "{from} to {to}",
    /** A console row names both sides: the renter, then the lister. */
    rowPeople: "{renter} with {lister}",
    jumpToday: "Today",
    filtersLabel: "Filter visits",
    state: "State",
    mode: "Visit mode",
    city: "City",
    lister: "Lister",
    anyState: "Any state",
    anyMode: "Any mode",
    anyCity: "Any city",
    anyLister: "Any lister",
    apply: "Apply",
    clear: "Clear filters",
    countsLabel: "Visits per day",
    inRange: "{visits} in this range",
    dayNone: "No visits on {date}.",
    dayPickHint: "Pick a day to see its visits.",
    noneTitle: "No visits in this range",
    noneBody: "Visits appear here on the day they are for, from the moment a renter asks. Nothing on this screen is waiting on you.",
    noMatchTitle: "Nothing matches these filters",
    noMatchBody: "Clear a filter or move to another week or month.",
    unnamed: "No display name",
    listingGone: "Listing removed",
    detailTitle: "Visit detail",
    detailEmpty: "Pick a visit to see its listing, the two sides, its history and the reminders sent.",
    detailMissing: "That visit is not in this range.",
    closeDetail: "Close the detail",
    listing: "Listing",
    listerSide: "Lister",
    renterSide: "Renter",
    when: "For",
    askedFor: "Asked for",
    openListing: "Open the listing",
    openPerson: "Open the member file",
    history: "History",
    historySteps: {
      requested: "Requested",
      answered: "Answered by the lister",
      confirmed: "Confirmed",
      done: "Recorded as done",
      noShowReported: "No-show reported",
      noShowDisputed: "No-show disputed",
      noShowResolved: "No-show decided",
    },
    reminders: "Reminders sent",
    reminderStages: {
      eve: "Evening before, 19:00",
      morning: "Morning of, 08:00",
      soon: "Two hours before",
    },
    audiences: {
      renter: "to the renter",
      lister: "to the lister",
    },
    remindersNone: "No reminder has been sent for this visit.",
    remindersUnreadable:
      "Reminders cannot be read from the console yet: the read policy is in the pending migration visit_reminders_both_sides.",
    noShows: "No-show",
    noShowNone: "No no-show reported.",
    absentRequester: "The renter is said to have stayed away",
    absentLister: "The lister is said to have stayed away",
    resolutionUpheld: "Upheld",
    resolutionOverturned: "Overturned",
    resolutionOpen: "Not decided yet",
    noShowsUnreadable: "No-show records could not be read just now.",
  },
};

export type VisitOpsCopy = typeof visitOpsEn;
