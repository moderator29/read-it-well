import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("../actions/session", () => ({ resolveSession: async () => session.current }));

const { readMyHostDraft, getMyHostDraft } = await import("./queries");

/** A signed-in client whose draft row reads and whose private-fields call answers `rpc`. */
function signedIn(rpc: { data: unknown; error: unknown }) {
  const row = {
    id: "biz-1",
    name: "Harbour Inn",
    slug: "harbour-inn",
    kind: "hotel",
    status: "DRAFT",
    host_type: "business",
  };
  const chain: Record<string, unknown> = {};
  for (const step of ["select", "eq", "in", "order", "limit"]) chain[step] = () => chain;
  chain.maybeSingle = async () => ({ data: row, error: null });
  return {
    state: "signed-in",
    user: { id: "owner-1" },
    supabase: { from: () => chain, rpc: async () => rpc },
  };
}

describe("the host draft when its private fields cannot be read", () => {
  beforeEach(() => {
    session.current = null;
  });

  it("is unavailable, not a blank form a save would write back", async () => {
    session.current = signedIn({ data: null, error: { message: "function does not exist" } });
    expect(await readMyHostDraft()).toEqual({ state: "unavailable" });
  });

  it("shows as no draft on the read-only screens", async () => {
    session.current = signedIn({ data: null, error: { message: "timeout" } });
    const draft = await getMyHostDraft();
    expect(draft.businessId).toBeNull();
  });

  it("is ready for a signed-out reader (an empty draft)", async () => {
    session.current = { state: "signed-out" };
    const read = await readMyHostDraft();
    expect(read.state).toBe("ready");
  });
});
