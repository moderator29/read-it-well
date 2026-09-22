import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE SIDE IS DECIDED PER ROW AND NEVER PER SESSION.
 *
 * On a marketplace where an agent is also a renter, one person is the payer on
 * one agreement and the payee on another, in the same list, on the same
 * screen. Every sentence and every control on a card is a function of
 * `viewer`, so getting it from the session rather than from the row would
 * offer somebody the wrong buttons on half their own list.
 *
 * And: AN UNREADABLE LIST AND AN EMPTY ONE MEAN OPPOSITE THINGS. Telling
 * somebody they have no held payments when the query failed is how a person
 * concludes their money is gone, so the read reports which it had.
 */
const seam = vi.hoisted(() => ({
  signedIn: true,
  escrows: null as unknown,
  escrowsError: null as unknown,
  evidence: [] as unknown[],
  evidenceError: null as unknown,
}));

const ME = "11111111-1111-4111-8111-111111111111";
const THEM = "22222222-2222-4222-8222-222222222222";

function builder(table: string) {
  const answer =
    table === "escrows"
      ? { data: seam.escrows, error: seam.escrowsError }
      : { data: seam.evidence, error: seam.evidenceError };
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain["select"] = self;
  chain["eq"] = self;
  chain["order"] = () => ({ ...chain, ...answer, then: undefined });
  chain["limit"] = async () => answer;
  chain["maybeSingle"] = async () => ({
    data: Array.isArray(seam.escrows) ? (seam.escrows[0] ?? null) : null,
    error: seam.escrowsError,
  });
  chain["then"] = (resolve: (v: unknown) => unknown) => Promise.resolve(answer).then(resolve);
  return chain;
}

vi.mock("../actions/session", () => ({
  resolveSession: async () =>
    seam.signedIn
      ? { state: "signed-in", user: { id: ME }, supabase: { from: (t: string) => builder(t) } }
      : { state: "signed-out" },
}));

function row(overrides: Record<string, unknown>) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    state: "HELD",
    purpose: "agency_fee",
    amount_minor: 250000,
    commission_minor: 0,
    payer_id: ME,
    payee_id: THEM,
    listing_id: null,
    auto_release_at: "2026-10-14T09:00:00Z",
    held_at: "2026-09-22T09:00:00Z",
    release_requested_at: null,
    disputed_at: null,
    resolved_at: null,
    released_at: null,
    refunded_at: null,
    initiated_at: "2026-09-22T09:00:00Z",
    payer_confirmed_at: null,
    payee_confirmed_at: null,
    dispute_reason: null,
    resolution_note: null,
    ...overrides,
  };
}

beforeEach(() => {
  seam.signedIn = true;
  seam.escrows = null;
  seam.escrowsError = null;
  seam.evidence = [];
  seam.evidenceError = null;
});

describe("reading held payments", () => {
  it("calls the caller the payer on one row and the payee on the next", async () => {
    seam.escrows = [
      row({ id: "aaaaaaaa-1111-4111-8111-111111111111", payer_id: ME, payee_id: THEM }),
      row({ id: "bbbbbbbb-1111-4111-8111-111111111111", payer_id: THEM, payee_id: ME }),
    ];
    const { readHeldPayments } = await import("./queries");
    const { payments } = await readHeldPayments();

    expect(payments).toHaveLength(2);
    expect(payments[0]?.viewer).toBe("payer");
    expect(payments[0]?.counterpartyId).toBe(THEM);
    expect(payments[1]?.viewer).toBe("payee");
    expect(payments[1]?.counterpartyId).toBe(THEM);
  });

  it("tells an empty list apart from an unreadable one", async () => {
    seam.escrows = [];
    const { readHeldPayments } = await import("./queries");
    const empty = await readHeldPayments();
    expect(empty.payments).toEqual([]);
    expect(empty.readFailed).toBe(false);

    seam.escrowsError = { message: "gone" };
    const broken = await readHeldPayments();
    expect(broken.payments).toEqual([]);
    expect(broken.readFailed).toBe(true);
  });

  it("counts only what is still waiting on somebody as open", async () => {
    seam.escrows = [
      row({ id: "aaaaaaaa-1111-4111-8111-111111111111", state: "HELD" }),
      row({ id: "bbbbbbbb-1111-4111-8111-111111111111", state: "DISPUTED" }),
      row({ id: "cccccccc-1111-4111-8111-111111111111", state: "RELEASED" }),
      row({ id: "dddddddd-1111-4111-8111-111111111111", state: "CANCELLED" }),
    ];
    const { readHeldPayments } = await import("./queries");
    const { openCount, payments } = await readHeldPayments();
    expect(payments).toHaveLength(4);
    expect(openCount).toBe(2);
  });

  it("returns nothing at all to somebody who is not signed in", async () => {
    seam.signedIn = false;
    const { readHeldPayments } = await import("./queries");
    const list = await readHeldPayments();
    expect(list.payments).toEqual([]);
    expect(list.readFailed).toBe(false);
  });

  it("drops a row it cannot make sense of rather than inventing fields", async () => {
    seam.escrows = [row({}), { id: "broken" }];
    const { readHeldPayments } = await import("./queries");
    const { payments } = await readHeldPayments();
    expect(payments).toHaveLength(1);
  });
});

describe("reading one held payment", () => {
  it("fails the whole detail when the evidence read fails", async () => {
    /*
     * A dispute where the evidence read quietly returned nothing would tell
     * one party the other has filed nothing, which is the single most
     * misleading thing this screen could say.
     */
    seam.escrows = [row({})];
    seam.evidenceError = { message: "gone" };
    const { readHeldPayment } = await import("./queries");
    const detail = await readHeldPayment("33333333-3333-4333-8333-333333333333");
    expect(detail.readFailed).toBe(true);
    expect(detail.evidence).toEqual([]);
  });

  it("marks which side filed each piece of evidence", async () => {
    seam.escrows = [row({})];
    seam.evidence = [
      { id: "e1", kind: "fact", author_id: ME, fact: "viewing_missed", happened_on: "2026-09-01", created_at: "2026-09-22T10:00:00Z" },
      { id: "e2", kind: "fact", author_id: THEM, fact: "viewing_attended", happened_on: "2026-09-01", created_at: "2026-09-22T11:00:00Z" },
    ];
    const { readHeldPayment } = await import("./queries");
    const detail = await readHeldPayment("33333333-3333-4333-8333-333333333333");
    expect(detail.evidence.map((e) => e.mine)).toEqual([true, false]);
  });
});
