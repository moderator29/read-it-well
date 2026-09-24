/**
 * OPS-04: a catalogue read that errors raises an alert and logs; a read that
 * succeeds with no rows stays the honest empty state and raises nothing.
 *
 * Before this, `search` answered `[]` and `byId` answered `null` for a 42501
 * exactly as for an empty catalogue, and wrote nothing anywhere, which is how
 * an 11.5-hour outage looked like "0 properties" to every visitor.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const recordAlert = vi.fn(async (_input: unknown) => ({ ok: true, id: "a", deduplicated: false }));
vi.mock("../alerts/record", () => ({ recordAlert: (input: unknown) => recordAlert(input) }));

type Answer = { data: unknown; error: unknown } | "throw";
let answer: Answer = { data: [], error: null };

/** A PostgREST builder stand-in: every method chains, and awaiting it yields `answer`. */
function builder(): unknown {
  const target = {
    then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
      if (answer === "throw") reject(new TypeError("fetch failed"));
      else resolve(answer);
    },
  };
  return new Proxy(target, {
    get(t, prop) {
      if (prop === "then") return t.then;
      return () => builder();
    },
  });
}

vi.mock("../supabase/server", () => ({
  createClient: async () => ({ from: () => builder() }),
}));

const { SupabaseListingRepository } = await import("./supabase-repository");

beforeEach(() => {
  recordAlert.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const PERMISSION_DENIED = { code: "42501", message: "permission denied for function owns_listing" };

describe("catalogue reads: an error is not an empty catalogue", () => {
  it("search: a refused read alerts (critical, catalogue.read_failed) and still renders empty", async () => {
    answer = { data: null, error: PERMISSION_DENIED };
    const out = await new SupabaseListingRepository().search({});
    expect(out).toEqual([]);
    expect(recordAlert).toHaveBeenCalledTimes(1);
    expect(recordAlert.mock.calls[0]?.[0]).toMatchObject({
      kind: "catalogue.read_failed",
      severity: "critical",
      detail: { surface: "search", code: "42501" },
    });
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("surface=search code=42501"));
  });

  it("search: a transport failure alerts too", async () => {
    answer = "throw";
    expect(await new SupabaseListingRepository().search({})).toEqual([]);
    expect(recordAlert.mock.calls[0]?.[0]).toMatchObject({ detail: { surface: "search", code: "TypeError" } });
  });

  it("search: a catalogue that is really empty raises nothing", async () => {
    answer = { data: [], error: null };
    expect(await new SupabaseListingRepository().search({})).toEqual([]);
    expect(recordAlert).not.toHaveBeenCalled();
  });

  it("byId: a refused read alerts; a listing that does not exist does not", async () => {
    answer = { data: null, error: PERMISSION_DENIED };
    expect(await new SupabaseListingRepository().byId("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(recordAlert.mock.calls[0]?.[0]).toMatchObject({ detail: { surface: "by_id", code: "42501" } });

    recordAlert.mockClear();
    answer = { data: null, error: null };
    expect(await new SupabaseListingRepository().byId("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(recordAlert).not.toHaveBeenCalled();
  });

  it("byReference: a refused read alerts", async () => {
    answer = { data: null, error: PERMISSION_DENIED };
    expect(await new SupabaseListingRepository().byReference("VAL-ABC123")).toBeNull();
    expect(recordAlert.mock.calls[0]?.[0]).toMatchObject({ detail: { surface: "by_reference" } });
  });
});
