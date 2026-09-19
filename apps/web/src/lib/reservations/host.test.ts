import { describe, expect, it } from "vitest";

import { reservationHostUserId, reservationSpine } from "./host";

/**
 * The host of a table, on either spine, the way the b3 party check resolves
 * it: the listing's agent as a user, else the business's owner. A business
 * reservation used to resolve no host at all on the application side, so its
 * thread could never open even though the database admitted it.
 */
describe("reservationHostUserId", () => {
  it("resolves a listing reservation through the agent's user id", () => {
    expect(
      reservationHostUserId({
        listing_id: "l1",
        business_id: null,
        listings: { agent_id: "a1", agents: { user_id: "host-1" } },
        businesses: null,
      }),
    ).toBe("host-1");
  });

  it("resolves a business reservation through businesses.owner_id", () => {
    expect(
      reservationHostUserId({
        listing_id: null,
        business_id: "b1",
        listings: null,
        businesses: { owner_id: "owner-1" },
      }),
    ).toBe("owner-1");
  });

  it("answers null when neither embed carried a person, so the caller falls back", () => {
    expect(
      reservationHostUserId({
        listing_id: "l1",
        business_id: null,
        listings: { agent_id: "a1", agents: null },
      }),
    ).toBeNull();
    expect(reservationHostUserId({ listing_id: null, business_id: "b1", businesses: null })).toBeNull();
    expect(reservationHostUserId({ business_id: "b1", businesses: { owner_id: null } })).toBeNull();
  });
});

describe("reservationSpine", () => {
  it("names the business spine with its id when listing_id is null", () => {
    expect(reservationSpine({ listing_id: null, business_id: "b1" })).toEqual({
      kind: "business",
      businessId: "b1",
    });
  });

  it("names the listing spine with the agent id the embed carried", () => {
    expect(
      reservationSpine({ listing_id: "l1", business_id: null, listings: { agent_id: "a1", agents: null } }),
    ).toEqual({ kind: "listing", agentId: "a1" });
  });

  it("refuses a row on neither spine", () => {
    expect(reservationSpine({ listing_id: null, business_id: null })).toBeNull();
  });
});
