import "server-only";
import type { AgentDashboard, AgentProfile, AgentRepository } from "./types";

/**
 * Agent data access.
 *
 * Selected by NF_DATA_SOURCE, same contract as the listing repository. The seed
 * profile is APPROVED so Agent Mode is explorable end to end during design work;
 * every surface that renders seed numbers labels them as sample, so nothing is
 * presented as a real balance or booking (Master Rule 8, Rule 50 on financial
 * data integrity). The real repository will read the signed-in agent and their
 * verified status from the platform, and must refuse "agent" mode for anyone
 * not actually approved.
 */

const SEED_PROFILE: AgentProfile = {
  id: "seed-agent",
  displayName: "Demo Agent",
  status: "APPROVED",
  type: "individual",
  verified: true,
  applicationRef: "NF-AGT-00042",
  submittedAt: "2026-05-24",
};

/** Deterministic sample dashboard. Kobo throughout. */
const SEED_DASHBOARD: AgentDashboard = {
  totalEarningsMinor: 845_060_000,
  totalBookings: 248,
  activeListings: 12,
  occupancyPct: 76,
  responsePct: 98,
  deltas: { earnings: 18.7, bookings: 12.5, listings: 2, occupancy: 8.4, response: 5 },
  earningsSeries: [
    58, 61, 57, 66, 72, 69, 74, 71, 80, 77, 85, 79, 88, 94, 90, 101, 97, 108,
  ].map((m) => m * 100_000),
  bookingSources: [
    { label: "NaijaFinds App", count: 158, hue: "#F97316" },
    { label: "Website", count: 62, hue: "#8B5CF6" },
    { label: "Direct", count: 28, hue: "#22D3EE" },
  ],
  recentBookings: [
    { id: "b1", title: "Oceanview 3BR Apartment", dates: "May 24 to May 26", amountMinor: 50_000_000, status: "confirmed" },
    { id: "b2", title: "Victoria Island Luxury Stay", dates: "May 27 to May 29", amountMinor: 56_000_000, status: "confirmed" },
    { id: "b3", title: "Cozy Studio Apartment", dates: "May 30 to Jun 1", amountMinor: 24_000_000, status: "pending" },
    { id: "b4", title: "Executive 2BR Duplex", dates: "Jun 2 to Jun 5", amountMinor: 92_000_000, status: "pending" },
  ],
  listingPerformance: [
    { id: "l1", title: "Oceanview 3BR Apartment", views: 1245, bookings: 36, occupancyPct: 82, revenueMinor: 324_000_000 },
    { id: "l2", title: "Victoria Island Luxury Stay", views: 987, bookings: 28, occupancyPct: 74, revenueMinor: 268_000_000 },
    { id: "l3", title: "Cozy Studio Apartment", views: 654, bookings: 18, occupancyPct: 61, revenueMinor: 132_000_000 },
    { id: "l4", title: "Executive 2BR Duplex", views: 543, bookings: 22, occupancyPct: 88, revenueMinor: 221_000_000 },
  ],
  guestMessages: [
    { id: "m1", from: "John D.", preview: "Can I check in early?", ago: "2m ago", unread: true },
    { id: "m2", from: "Maryam S.", preview: "Thanks for the wonderful stay!", ago: "1h ago", unread: true },
    { id: "m3", from: "Tunde A.", preview: "Payment confirmed", ago: "3h ago", unread: false },
  ],
};

class SeedAgentRepository implements AgentRepository {
  readonly isSeed = true;
  async getProfile(): Promise<AgentProfile> {
    return SEED_PROFILE;
  }
  async getDashboard(): Promise<AgentDashboard> {
    return SEED_DASHBOARD;
  }
}

class ApiAgentRepository implements AgentRepository {
  readonly isSeed = false;
  async getProfile(): Promise<AgentProfile> {
    throw new Error("NF_DATA_SOURCE=api but the agent API is not implemented yet.");
  }
  async getDashboard(): Promise<AgentDashboard> {
    throw new Error("NF_DATA_SOURCE=api but the agent API is not implemented yet.");
  }
}

export function getAgentRepository(): AgentRepository {
  return process.env.NF_DATA_SOURCE === "api"
    ? new ApiAgentRepository()
    : new SeedAgentRepository();
}
