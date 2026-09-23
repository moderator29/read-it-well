import { describe, expect, it, vi } from "vitest";

/* A fake RLS client: tables by name, and a storage bucket that signs. */
const tables: Record<string, Record<string, unknown>[]> = {};
const writes: string[] = [];
let signFails = false;

function builder(table: string) {
  let rows = [...(tables[table] ?? [])];
  let head = false;
  let range: [number, number] | null = null;
  const chain: Record<string, unknown> = {
    select: (_c: string, o?: { head?: boolean }) => ((head = Boolean(o?.head)), chain),
    in: (col: string, vals: unknown[]) => ((rows = rows.filter((r) => vals.includes(r[col]))), chain),
    order: () => chain,
    range: (f: number, t: number) => ((range = [f, t]), chain),
    then: (resolve: (v: unknown) => unknown) =>
      resolve(head ? { count: rows.length, error: null } : { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null }),
  };
  for (const w of ["insert", "update", "upsert", "delete"]) chain[w] = () => (writes.push(`${table}.${w}`), chain);
  return chain;
}

vi.mock("../guard", () => ({
  requireAdmin: async () => ({
    state: "admin",
    supabase: {
      from: (t: string) => builder(t),
      storage: {
        from: () => ({
          createSignedUrls: async (paths: string[]) =>
            signFails ? { data: null, error: new Error("x") } : { data: paths.map((p) => ({ signedUrl: `https://signed/${p}` })), error: null },
        }),
      },
    },
  }),
}));

const { evidenceFromRows, floatHistoryFromRows, getDisputeEvidence, getEscrowFloatHistory } = await import("./escrow");

describe("evidence on a dispute", () => {
  it("places each item on its side, names who filed it, and orders oldest first", () => {
    const out = evidenceFromRows(
      [
        { id: "e2", escrow_id: "x", kind: "file", author_id: "payee", file_name: "receipt.pdf", storage_path: "x/r.pdf", mime_type: "application/pdf", size_bytes: 2048, caption: "The receipt", created_at: "2026-09-21T10:00:00Z" },
        { id: "e1", escrow_id: "x", kind: "fact", author_id: "payer", fact: "keys_not_received", created_at: "2026-09-20T10:00:00Z" },
        { id: "e3", escrow_id: "x", kind: "fact", author_id: "someone", fact: "amount_agreed", amount_minor: 5000, created_at: "2026-09-22T10:00:00Z" },
      ],
      new Map([["x", { payerId: "payer", payeeId: "payee" }]]),
      new Map([["payer", "Amaka"]]),
      new Map([["x/r.pdf", "https://signed/x/r.pdf"]]),
    );
    expect(out.x!.map((e) => [e.id, e.side, e.authorName])).toEqual([
      ["e1", "payer", "Amaka"],
      ["e2", "payee", null],
      ["e3", "other", null],
    ]);
    expect(out.x![1]!.fileUrl).toBe("https://signed/x/r.pdf");
    expect(out.x![2]!.amountMinor).toBe(5000);
  });

  it("reads through the RLS client, signs files, and never writes", async () => {
    tables.escrows = [{ id: "d1", payer_id: "u1", payee_id: "u2" }];
    tables.escrow_evidence = [
      { id: "e1", escrow_id: "d1", kind: "file", author_id: "u2", file_name: "a.png", storage_path: "d1/a.png", mime_type: "image/png", created_at: "2026-09-22T09:00:00Z" },
    ];
    tables.profiles = [{ id: "u2", display_name: "Grace" }];
    const out = await getDisputeEvidence(["d1"]);
    expect(out.state).toBe("ok");
    if (out.state === "ok") {
      expect(out.data.d1![0]).toMatchObject({ side: "payee", authorName: "Grace", fileUrl: "https://signed/d1/a.png" });
    }
    expect(writes).toEqual([]);
  });

  it("lists a file it could not sign rather than dropping it", async () => {
    signFails = true;
    const out = await getDisputeEvidence(["d1"]);
    signFails = false;
    expect(out.state === "ok" && out.data.d1![0]!.fileUrl).toBeNull();
  });

  it("answers an empty map, not a failure, when nothing is disputed", async () => {
    expect(await getDisputeEvidence([])).toEqual({ state: "ok", data: {} });
  });
});

describe("the escrow float's daily booking", () => {
  it("orders the days and counts the ones that did not balance", () => {
    const h = floatHistoryFromRows(
      [
        { as_of: "2026-09-23", float_minor: 100, ledger_float_minor: 100, difference_minor: 0, escrow_count: 1 },
        { as_of: "2026-09-21", float_minor: 90, ledger_float_minor: 80, difference_minor: 10, escrow_count: 1 },
        { as_of: "2026-09-22", float_minor: 0, ledger_float_minor: 0, difference_minor: 0, escrow_count: 0 },
      ],
      3,
      true,
    );
    expect(h.points.map((p) => p.asOf)).toEqual(["2026-09-21", "2026-09-22", "2026-09-23"]);
    expect(h.unbalancedDays).toBe(1);
    expect(h.lastUnbalanced).toBe("2026-09-21");
    expect(h.complete).toBe(true);
  });

  it("reads every snapshot against an exact count", async () => {
    tables.escrow_float_snapshots = [
      { id: "s1", as_of: "2026-09-23", taken_at: "2026-09-23T03:05:00Z", float_minor: 0, ledger_float_minor: 0, difference_minor: 0, escrow_count: 0, commission_booked_minor: 0 },
    ];
    const out = await getEscrowFloatHistory();
    expect(out.state === "ok" && out.data).toMatchObject({ total: 1, unbalancedDays: 0, complete: true });
  });
});
