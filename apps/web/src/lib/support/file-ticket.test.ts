import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The in-app query flow files through `fileSupportTicket`: a signed-in member
 * is not asked for a name or an email (both come from the account), gets the
 * ticket id back so the screen can open the thread, and can link one of their
 * own records, whose label is rebuilt on the server. A signed-out filer still
 * has to give both, never gets an id, and cannot link a record.
 */
const state = vi.hoisted(() => ({
  signedIn: false,
  inserted: [] as Record<string, unknown>[],
  related: null as null | { kind: string; id: string; label: string },
  relatedAsked: [] as unknown[],
}));

function client() {
  const chain: Record<string, unknown> = {};
  let table = "";
  chain["from"] = (name: string) => {
    table = name;
    return chain;
  };
  chain["insert"] = (row: Record<string, unknown>) => {
    if (table === "support_tickets") state.inserted.push(row);
    return chain;
  };
  for (const m of ["select", "eq"]) chain[m] = () => chain;
  chain["single"] = async () => ({ data: { id: "3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a" }, error: null });
  chain["maybeSingle"] = async () => ({ data: { first_name: "Seyi", display_name: "Seyi Omojuni" }, error: null });
  return chain;
}

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }));
vi.mock("../flags", () => ({ isFeatureEnabled: async () => true }));
vi.mock("../supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("../supabase/admin", () => ({ createAdminClient: () => client() }));
vi.mock("../locale", () => ({ getLocale: async () => "en" }));
vi.mock("./related-records", () => ({
  readMyRelatedRecord: async (...args: unknown[]) => {
    state.relatedAsked.push(args.slice(1));
    return state.related;
  },
}));
vi.mock("../actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "nc",
  resolveSession: async () =>
    state.signedIn
      ? { state: "signed-in", user: { id: "u1", email: "seyi@example.invalid" }, supabase: client() }
      : { state: "signed-out" },
}));
vi.mock("../email/client", () => ({ bestEffortEmail: async () => undefined, sendMessage: async () => undefined }));
vi.mock("../security/rate-limit", async (importOriginal) => {
  const real = await importOriginal<typeof import("../security/rate-limit")>();
  return { ...real, consume: async () => ({ allowed: true, degraded: false }) };
});

const { fileSupportTicket } = await import("./actions");

const RELATED_ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

beforeEach(() => {
  state.signedIn = false;
  state.inserted = [];
  state.related = null;
  state.relatedAsked = [];
});

describe("filing from the in-app query flow", () => {
  it("files a signed-in member's question under their account name and sign-in email, and returns the id", async () => {
    state.signedIn = true;
    const result = await fileSupportTicket({ topic: "payment", kind: "problem", body: "My refund has not arrived." });
    expect(result.ok).toBe(true);
    expect(result.ok && result.data.id).toBe("3f2b8c1e-9a4d-4c2e-8f1a-0b9c8d7e6f5a");
    expect(state.inserted[0]).toMatchObject({
      name: "Seyi",
      email: "seyi@example.invalid",
      topic: "payment",
      kind: "problem",
      user_id: "u1",
      status: "open",
    });
  });

  it("stores a linked record with the label read on the server, never the one sent", async () => {
    state.signedIn = true;
    state.related = { kind: "payment", id: RELATED_ID, label: "Payment of ₦184,500, 21 Sept" };
    const result = await fileSupportTicket({
      topic: "payment",
      body: "About this payment.",
      related: { kind: "payment", id: RELATED_ID },
    });
    expect(result.ok).toBe(true);
    expect(state.relatedAsked[0]).toEqual(["u1", "en", "payment", RELATED_ID]);
    expect(state.inserted[0]).toMatchObject({
      related_kind: "payment",
      related_id: RELATED_ID,
      related_label: "Payment of ₦184,500, 21 Sept",
    });
  });

  it("refuses a record that is not on the member's account and files nothing", async () => {
    state.signedIn = true;
    const result = await fileSupportTicket({
      topic: "booking",
      body: "About this booking.",
      related: { kind: "booking", id: RELATED_ID },
    });
    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });

  it("still asks a signed-out filer for a name and an email, and gives back no id", async () => {
    const missing = await fileSupportTicket({ body: "Hello there" });
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.fieldErrors).toMatchObject({ name: expect.any(String), email: expect.any(String) });

    const filed = await fileSupportTicket({ name: "Ada", email: "ada@example.invalid", body: "Hello there" });
    expect(filed.ok).toBe(true);
    expect(filed.ok && "id" in filed.data).toBe(false);
  });

  it("takes a topic only as a code from the shared list", async () => {
    state.signedIn = true;
    const free = await fileSupportTicket({ topic: "URGENT read me first" as never, body: "Hello there" });
    expect(free.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
    const coded = await fileSupportTicket({ topic: "safety", body: "Someone asked me to pay outside." });
    expect(coded.ok).toBe(true);
    expect(state.inserted[0]).toMatchObject({ topic: "safety" });
  });

  it("will not let a signed-out filer link a record", async () => {
    const result = await fileSupportTicket({
      name: "Ada",
      email: "ada@example.invalid",
      body: "Hello there",
      related: { kind: "booking", id: RELATED_ID },
    });
    expect(result.ok).toBe(false);
    expect(state.inserted).toHaveLength(0);
  });
});
