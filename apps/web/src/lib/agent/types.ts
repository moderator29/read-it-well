/**
 * Agent domain types.
 *
 * The application and the listing are two different state machines, which is
 * correct: an agent is verified once, then lists many properties. The labels
 * here are the single canonical vocabulary that resolves intake C-03, where the
 * source documents used three different names for the same states.
 */

/** Agent application lifecycle. */
export type AgentApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFO_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export type AgentType = "individual" | "business";

export type AgentProfile = {
  id: string;
  displayName: string;
  status: AgentApplicationStatus;
  type: AgentType;
  verified: boolean;
  /** Application reference in the NF-AGT-##### format the references show. */
  applicationRef: string;
  submittedAt: string | null;
};

/** Dashboard metrics. Money fields are integer kobo. */
export type AgentDashboard = {
  totalEarningsMinor: number;
  totalBookings: number;
  activeListings: number;
  occupancyPct: number;
  responsePct: number;
  /** Month-over-month deltas as signed percentages. */
  deltas: {
    earnings: number;
    bookings: number;
    listings: number;
    occupancy: number;
    response: number;
  };
  /** Daily earnings for the sparkline, integer kobo, oldest first. */
  earningsSeries: number[];
  bookingSources: { label: string; count: number; hue: string }[];
  recentBookings: {
    id: string;
    title: string;
    dates: string;
    amountMinor: number;
    status: "confirmed" | "pending";
  }[];
  listingPerformance: {
    id: string;
    title: string;
    views: number;
    bookings: number;
    occupancyPct: number;
    revenueMinor: number;
  }[];
  guestMessages: { id: string; from: string; preview: string; ago: string; unread: boolean }[];
};

export interface AgentRepository {
  readonly isSeed: boolean;
  getProfile(): Promise<AgentProfile>;
  getDashboard(): Promise<AgentDashboard>;
}
