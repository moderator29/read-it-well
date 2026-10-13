import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * V-58 at the console. The register is read as the operator (the function
 * decides on auth.uid()), shaped without inventing a listing, and a stamp is
 * cleared only with a written reason, through the one audited function.
 */
const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  calls: [] as { fn: string; args?: Record<string, unknown> }[],
  answer: { data: null as unknown, error: null as { code?: string } | null },
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => seam.revalidated.push(path) }));
vi.mock("../guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  adminRefusal: () => "refused",
  requireAdmin: async () =>
    seam.access["state"] === "admin"
      ? {
          state: "admin",
          isStaff: false,
          userClient: {
            rpc: async (fn: string, args?: Record<string, unknown>) => {
              seam.calls.push({ fn, ...(args ? { args } : {}) });
              return seam.answer;
            },
          },
          ...seam.access,
        }
      : seam.access,
}));
vi.mock("../../supabase/admin", () => ({
  createAdminClient: () => {
    throw new Error("no service role in this test");
  },
}));

const { shapeWeightRows } = await import("./weight-withheld-shape");
const { clearWeightWithheld } = await import("./weight-withheld-actions");
const { readWeightWithheld } = await import("./weight-withheld");

const ID = "7c1e9a52-3b84-4d6f-9a21-5e0d8f4b6c13";
const empty = { reviews: new Map(), reports: new Map(), listings: new Map<string, string>() };

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.calls = [];
  seam.answer = { data: null, error: null };
  seam.revalidated = [];
});

describe("shapeWeightRows", () => {
  it("names the listing and rating of a review it can find, and says so when it cannot", () => {
    const rows = shapeWeightRows(
      [
        { kind: "review", subject_id: ID, reasons: ["phone", "card"], stamped_at: "2026-10-01T00:00:00Z" },
        { kind: "review", subject_id: "gone", reasons: ["mailbox"], stamped_at: "2026-09-01T00:00:00Z" },
      ],
      { ...empty, reviews: new Map([[ID, { listingId: "L1", rating: 5 }]]), listings: new Map([["L1", "Two bed in Yaba"]]) },
    );
    expect(rows[0]).toMatchObject({ kind: "review", listingTitle: "Two bed in Yaba", rating: 5, gone: false, reasons: ["phone", "card"] });
    expect(rows[1]).toMatchObject({ gone: true, listingTitle: null, rating: null });
  });

  it("keeps reports, drops kinds the register cannot hold, and tolerates missing reasons", () => {
    const rows = shapeWeightRows(
      [
        { kind: "report", subject_id: ID, reasons: null, stamped_at: "x" },
        { kind: "truth", subject_id: ID, reasons: ["phone"], stamped_at: "x" },
      ],
      { ...empty, reports: new Map([[ID, { target: "listing" }]]) },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "report", target: "listing", reasons: [], gone: false });
  });
});

describe("readWeightWithheld", () => {
  it("is forbidden for anybody but an admin, and for scoped staff", async () => {
    seam.access = { state: "not-admin" };
    expect(await readWeightWithheld()).toEqual({ state: "forbidden" });
    seam.access = { state: "admin", isStaff: true };
    expect(await readWeightWithheld()).toEqual({ state: "forbidden" });
    expect(seam.calls).toEqual([]);
  });

  it("reads the register on the operator's own client and shapes an empty one", async () => {
    seam.answer = { data: [], error: null };
    expect(await readWeightWithheld()).toEqual({ state: "ok", rows: [], total: 0 });
    expect(seam.calls).toEqual([{ fn: "weight_withheld_reasons" }]);
  });

  it("is unavailable, never an empty register, when the read fails", async () => {
    seam.answer = { data: null, error: { code: "XX000" } };
    expect(await readWeightWithheld()).toEqual({ state: "unavailable" });
  });

  it("still lists stamps when the listing lookup cannot run", async () => {
    seam.answer = { data: [{ kind: "review", subject_id: ID, reasons: ["phone"], stamped_at: "2026-10-01T00:00:00Z" }], error: null };
    const read = await readWeightWithheld();
    expect(read.state).toBe("ok");
    if (read.state === "ok") expect(read.rows[0]).toMatchObject({ gone: true, reasons: ["phone"] });
  });
});

describe("clearWeightWithheld", () => {
  const good = { kind: "review", subject: ID, note: "Two different people, I saw both IDs." };

  it("refuses a caller who is not an admin, before any call", async () => {
    seam.access = { state: "not-admin" };
    expect((await clearWeightWithheld(good)).ok).toBe(false);
    seam.access = { state: "admin", isStaff: true };
    expect((await clearWeightWithheld(good)).ok).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it("asks for a real reason and a real record before calling the database", async () => {
    expect((await clearWeightWithheld({ ...good, note: "short" })).ok).toBe(false);
    expect((await clearWeightWithheld({ ...good, subject: "nope" })).ok).toBe(false);
    expect((await clearWeightWithheld({ ...good, kind: "listing" })).ok).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it("sends exactly the function's arguments and refreshes the desk on 'cleared'", async () => {
    seam.answer = { data: "cleared", error: null };
    expect((await clearWeightWithheld(good)).ok).toBe(true);
    expect(seam.calls).toEqual([
      { fn: "clear_weight_withheld", args: { p_kind: "review", p_subject: ID, p_note: "Two different people, I saw both IDs." } },
    ]);
    expect(seam.revalidated).toEqual(["/admin/weight-withheld"]);
  });

  it("never reports success for a refusal or a failed call", async () => {
    for (const status of ["forbidden", "no_note", "not_found", "invalid"]) {
      seam.answer = { data: status, error: null };
      const result = await clearWeightWithheld(good);
      expect(result.ok, status).toBe(false);
    }
    seam.answer = { data: null, error: { code: "XX000" } };
    expect((await clearWeightWithheld(good)).ok).toBe(false);
    expect(seam.revalidated).toEqual([]);
  });
});
