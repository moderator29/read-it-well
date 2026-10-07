/**
 * The workspace desks and the confirm panel (plan items 14, 20 and 22):
 * the words the host, agent and console dashboards, the shared sidebar and
 * the one confirm panel draw. Its own module, as the other late namespaces
 * are, so the builders adding keys to `en.ts` do not collide.
 */
export const deskEn = {
  sidebar: {
    main: "Main",
    hostDesk: "Host workspace",
    agentDesk: "Agent workspace",
  },
  today: {
    title: "Today",
    needsYou: "Needs you today",
    nothing: "Nothing needs you today.",
    needsAttention: "Needs attention",
    seeNumbers: "See the numbers",
    viewAll: "View all {count}",
    openList: "Open the list",
    sumLine: "Each count links to the list it came from.",
  },
  /* The dashboard figure (reference 5): the range switch and the two series
     the agent and host desks count. */
  figure: {
    day: "Day",
    week: "Week",
    month: "Month",
    viewings: {
      title: "Viewing requests",
      day: "Viewing requests today",
      week: "Viewing requests in the last 7 days",
      month: "Viewing requests in the last 30 days",
      emptyDay: "No viewing requests yet today.",
      emptyWeek: "No viewing requests in the last 7 days.",
      emptyMonth: "No viewing requests in the last 30 days.",
    },
    bookings: {
      title: "Room bookings",
      day: "Room bookings made today",
      week: "Room bookings made in the last 7 days",
      month: "Room bookings made in the last 30 days",
      emptyDay: "No room bookings yet today.",
      emptyWeek: "No room bookings in the last 7 days.",
      emptyMonth: "No room bookings in the last 30 days.",
    },
  },
  range: {
    label: "Period",
    d7: "Last 7 days",
    d30: "Last 30 days",
    d90: "Last 90 days",
  },
  host: {
    kpi: {
      arriving: "Arriving today",
      staying: "Staying tonight",
      requests: "Requests waiting",
      unread: "Unread messages",
    },
    unit: {
      arriving: { one: "guest", other: "guests" },
      requests: { one: "request", other: "requests" },
      unread: { one: "message", other: "messages" },
    },
    pipeline: "Reservations by status",
    pipelineTotal: "reservations",
    stage: {
      requested: "Requested",
      confirmed: "Confirmed",
      checkedIn: "Staying now",
      completed: "Completed",
    },
    newListing: "Add a business",
    attention: {
      request: "Booking request from {guest}",
      table: "Table request from {guest}",
      draft: "Application not sent yet",
      draftSub: "{count} things still to add",
      stopped: "Open it to read the reviewer's note",
    },
  },
  agent: {
    kpi: {
      live: "Live listings",
      inspections: "Inspection requests",
      review: "With review",
      unread: "Unread messages",
    },
    pipeline: "Listings by status",
    pipelineTotal: "listings",
    stage: {
      draft: "Draft",
      review: "In review",
      live: "Live",
      other: "Paused or closed",
    },
  },
  admin: {
    kpi: {
      queue: "Queue open",
      reviews: "Reviews due",
      alerts: "Alerts",
      tickets: "Support tickets",
    },
    pipeline: "Work by desk",
    pipelineTotal: "waiting",
  },
  confirm: {
    close: "Close",
    cancel: "Cancel",
    next: "What happens next",
    everyone: "What everyone gets",
    total: "Total",
  },
};
