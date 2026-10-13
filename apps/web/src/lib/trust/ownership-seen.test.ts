import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * "Ownership seen" for a page of search results: one read for the page, never
 * one per card, and any failure is no mark rather than a guess.
 */
const seam = vi.hoisted(() => ({
  calls: [] as { fn: string; args: unknown }[],
  answer: { data: null as unknown, error: null as unknown },
}));

vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: async (fn: string, args: unknown) => {
      seam.calls.push({ fn, args });
      return seam.answer;
    },
  }),
}));

import { ownershipSeenForListings } from "./ownership-seen";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

beforeEach(() => {
  seam.calls = [];
  seam.answer = { data: null, error: null };
});

describe("ownershipSeenForListings", () => {
  it("reads the whole page in one call and maps only the listings that carry the mark", async () => {
    seam.answer = { data: [{ listing_id: A, seen_at: "2026-10-12T09:00:00+00:00" }], error: null };
    const seen = await ownershipSeenForListings([A, B, A]);
    expect(seam.calls).toEqual([{ fn: "listings_ownership_seen_at", args: { p_listings: [A, B] } }]);
    expect(seen.get(A)).toBe("2026-10-12T09:00:00+00:00");
    expect(seen.has(B)).toBe(false);
  });

  it("asks for nothing when there are no cards", async () => {
    const seen = await ownershipSeenForListings([]);
    expect(seam.calls).toEqual([]);
    expect(seen.size).toBe(0);
  });

  it("caps one read at 200 listings", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    await ownershipSeenForListings(ids);
    expect((seam.calls[0]?.args as { p_listings: string[] }).p_listings).toHaveLength(200);
  });

  it("draws no mark when the read fails or the function is not there yet", async () => {
    seam.answer = { data: null, error: { code: "PGRST202", message: "function not found" } };
    expect((await ownershipSeenForListings([A])).size).toBe(0);
  });

  it("drops a row whose date is not a date", async () => {
    seam.answer = { data: [{ listing_id: A, seen_at: "soon" }, { listing_id: B, seen_at: null }], error: null };
    expect((await ownershipSeenForListings([A, B])).size).toBe(0);
  });
});
