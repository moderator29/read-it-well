import { describe, expect, it } from "vitest";
import { createMatcher } from "./match";
import { screenParties } from "./screen";

const matcher = createMatcher([
  { entryId: "e1", source: "ng", reference: "FXN.001", primaryName: "Quorvin Adelmaro Tesk", names: ["adelmaro quorvin tesk"] },
]);

describe("screening a set of parties (SCUML item 8)", () => {
  it("records a clean screening, with the names it screened", () => {
    expect(screenParties([{ personId: "p1", names: ["Ada Obi", "ADA OBI "] }], matcher)).toEqual({
      outcome: "clear",
      best: 0,
      namesScreened: ["Ada Obi", "ADA OBI"],
      matches: [],
    });
  });

  it("gives each match to the party it belongs to, on a transaction with two", () => {
    const record = screenParties(
      [
        { personId: "guest", names: ["Ada Obi"] },
        { personId: "agent", names: ["Tesk Quorvin Adelmaro"] },
      ],
      matcher,
    );
    expect(record.outcome).toBe("exact");
    expect(record.matches).toHaveLength(1);
    expect(record.matches[0]).toMatchObject({ personId: "agent", reference: "FXN.001", kind: "exact" });
  });

  it("says no_list, never clear, with no list loaded, and no_name with nothing to screen", () => {
    expect(screenParties([{ personId: "p1", names: ["Ada Obi"] }], null).outcome).toBe("no_list");
    expect(screenParties([{ personId: "p1", names: [" "] }], matcher).outcome).toBe("no_name");
  });
});

describe("the screening run's seams (SCUML item 8)", () => {
  /* A recorded fake: every chain is answered by `answer(table, op)`. */
  function fake(answer: (table: string, op: string) => { data: unknown; error: unknown }) {
    const writes: { table: string; op: string; payload: unknown }[] = [];
    const rpcs: string[] = [];
    const chain = (table: string) => {
      let op = "select";
      let payload: unknown = null;
      const api: Record<string, unknown> = {};
      for (const name of ["select", "eq", "in", "not", "order", "range", "is", "limit"]) api[name] = () => api;
      for (const name of ["insert", "update", "upsert"]) {
        api[name] = (p: unknown) => {
          if (op === "select") op = name;
          payload = p;
          writes.push({ table, op: name, payload: p });
          return api;
        };
      }
      api.maybeSingle = async () => answer(table, "maybeSingle");
      api.single = async () => answer(table, op + ":single");
      api.then = (resolve: (v: unknown) => void) => resolve(answer(table, op));
      void payload;
      return api;
    };
    const admin = {
      from: chain,
      rpc: async (fn: string) => {
        rpcs.push(fn);
        if (fn === "sanctions_claim_queue") {
          return { data: [{ id: 1, subject_kind: "person", person_id: "p1", transaction_kind: null, transaction_id: null, trigger: "manual" }], error: null };
        }
        return { data: 0, error: null };
      },
    };
    return { admin, writes, rpcs };
  }

  const lists = (table: string, op: string) => {
    if (table === "sanctions_list_versions") return { data: [{ id: "v1", source: "ng", activated_at: "2026-09-01" }], error: null };
    if (table === "sanctions_entries") return { data: [{ id: "e1", source: "ng", reference: "FXN.001", primary_name: "Quorvin Adelmaro Tesk", names_normalised: ["adelmaro quorvin tesk"] }], error: null };
    if (table === "profiles" && op === "maybeSingle") return { data: { first_name: "Quorvin", surname: "Adelmaro Tesk", display_name: null }, error: null };
    if (table === "sanctions_screenings") return { data: { id: "s1" }, error: null };
    return { data: [], error: null };
  };

  it("leaves the row undone and counts a failure when the match cannot be recorded", async () => {
    const { drainScreenQueue } = await import("./screen");
    const { admin, writes, rpcs } = fake((table, op) =>
      table === "sanctions_hits" ? { data: null, error: { code: "57014" } } : lists(table, op),
    );
    const counts = await drainScreenQueue(admin as never, new Date("2026-09-24T12:00:00Z"));
    expect(rpcs).toEqual(["sanctions_renew_holds", "sanctions_claim_queue"]);
    expect(counts).toMatchObject({ failed: 1, screened: 0, hits: 0 });
    expect(writes.some((w) => w.table === "sanctions_screen_queue" && (w.payload as { done_at?: string }).done_at)).toBe(false);
  });

  it("marks the row done once its match is recorded", async () => {
    const { drainScreenQueue } = await import("./screen");
    const { admin, writes } = fake((table, op) => (table === "sanctions_hits" ? { data: [{ id: "h1" }], error: null } : lists(table, op)));
    const counts = await drainScreenQueue(admin as never, new Date("2026-09-24T12:00:00Z"));
    expect(counts).toMatchObject({ failed: 0, screened: 1, exact: 1, hits: 1 });
    expect(writes.some((w) => w.table === "sanctions_screen_queue" && (w.payload as { done_at?: string }).done_at)).toBe(true);
  });
});
