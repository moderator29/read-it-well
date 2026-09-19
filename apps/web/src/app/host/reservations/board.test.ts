import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HostReservationView } from "@/lib/reservations/queries";

/**
 * The venue's table board, in the two places it makes a decision of its own.
 *
 * Everything else on this surface is somebody else's: RLS decides which tables
 * this person may see, `getHostReservations` reads them, and
 * `respondToReservation` answers them. This file adds exactly two things and
 * both of them are worth a test.
 *
 * THE SPLIT. A PENDING request whose moment has already passed is not a
 * decision any more, it is a record. Left in the decision queue it sits at the
 * top of the board for ever, because nobody can accept a table for last
 * Tuesday, and a board whose first item can never be cleared is a board a venue
 * stops opening.
 *
 * THE NAME. `profiles` is select-own, so the reader's own guest name comes back
 * as a plain word through the caller's client. The board resolves it with the
 * service role for ids RLS has already handed back. When that read cannot
 * happen at all, every card must still draw under a plain label rather than
 * under a blank or a raw uuid.
 */

/* `vi.mock` is hoisted above every import, so the two doubles are created in a
   hoisted block as well rather than as module constants the factories would
   reach before they exist. */
const { getHostReservations, createAdminClient } = vi.hoisted(() => ({
  getHostReservations: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/reservations/queries", () => ({ getHostReservations }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

import { readHostTableBoard } from "./board";

const NOW = new Date("2026-09-19T17:00:00.000+01:00");
const HOUR = 3_600_000;

function row(overrides: Partial<HostReservationView> & { id: string }): HostReservationView {
  return {
    listingId: null,
    businessId: "b-1",
    listingTitle: "Yellow Chilli Ikoyi",
    location: "Ikoyi, Lagos",
    reservedFor: new Date(NOW.getTime() + 2 * HOUR).toISOString(),
    partySize: 2,
    status: "PENDING",
    note: null,
    respondedAt: null,
    conversationId: null,
    cancellable: true,
    guestId: "g-1",
    guestName: "A guest",
    awaitingAnswer: true,
    ...overrides,
  };
}

/** A service-role client whose one read answers with these profiles. */
function adminAnswering(profiles: { id: string; display_name: string | null }[]) {
  createAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({ in: () => Promise.resolve({ data: profiles, error: null }) }),
    }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  adminAnswering([]);
});

describe("readHostTableBoard", () => {
  it("hands back the signed-out and unavailable answers untouched", async () => {
    getHostReservations.mockResolvedValueOnce(null);
    expect(await readHostTableBoard(NOW)).toEqual({ state: "signed-out" });

    getHostReservations.mockResolvedValueOnce("unavailable");
    expect(await readHostTableBoard(NOW)).toEqual({ state: "unavailable" });
  });

  it("reads an empty venue as an empty board rather than a failure", async () => {
    getHostReservations.mockResolvedValueOnce([]);
    const read = await readHostTableBoard(NOW);
    expect(read).toEqual({ state: "ok", board: { requests: [], upcoming: [], past: [], total: 0 } });
  });

  it("puts a request still ahead in the decision queue and one whose moment has gone in the past", async () => {
    getHostReservations.mockResolvedValueOnce([
      row({ id: "ahead" }),
      row({ id: "gone", reservedFor: new Date(NOW.getTime() - HOUR).toISOString() }),
    ]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    expect(read.board.requests.map((table) => table.id)).toEqual(["ahead"]);
    expect(read.board.past.map((table) => table.id)).toEqual(["gone"]);
    expect(read.board.total).toBe(2);
  });

  it("separates an accepted table from a cancelled one", async () => {
    getHostReservations.mockResolvedValueOnce([
      row({ id: "tonight", status: "CONFIRMED", awaitingAnswer: false }),
      row({ id: "called-off", status: "CANCELLED", awaitingAnswer: false }),
    ]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    expect(read.board.upcoming.map((table) => table.id)).toEqual(["tonight"]);
    expect(read.board.past.map((table) => table.id)).toEqual(["called-off"]);
    expect(read.board.requests).toEqual([]);
  });

  it("names the guest from the profile read, for ids RLS already handed back", async () => {
    adminAnswering([{ id: "g-1", display_name: "Tunde Bakare" }]);
    getHostReservations.mockResolvedValueOnce([row({ id: "one" })]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    expect(read.board.requests[0]?.guestName).toBe("Tunde Bakare");
  });

  it("falls back to a plain label when the name cannot be resolved at all", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("no service key in this environment");
    });
    getHostReservations.mockResolvedValueOnce([row({ id: "one", guestId: "g-9" })]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    /* Never blank and never the id: a board that loads under a generic label
       is better than a board that will not load, and a uuid on a card is the
       database shown to a restaurant owner. */
    expect(read.board.requests[0]?.guestName).toBe("Vallo guest");
  });

  it("takes the profile read's empty name as no name at all", async () => {
    adminAnswering([{ id: "g-1", display_name: "   " }]);
    getHostReservations.mockResolvedValueOnce([row({ id: "one" })]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    expect(read.board.requests[0]?.guestName).toBe("Vallo guest");
  });

  it("shows the most recent of the past first, because that is the one being asked about", async () => {
    getHostReservations.mockResolvedValueOnce([
      row({
        id: "older",
        status: "CANCELLED",
        reservedFor: new Date(NOW.getTime() - 48 * HOUR).toISOString(),
      }),
      row({
        id: "newer",
        status: "CANCELLED",
        reservedFor: new Date(NOW.getTime() - 2 * HOUR).toISOString(),
      }),
    ]);

    const read = await readHostTableBoard(NOW);
    if (read.state !== "ok") throw new Error("expected a board");
    expect(read.board.past.map((table) => table.id)).toEqual(["newer", "older"]);
  });
});
