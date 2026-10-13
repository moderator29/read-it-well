import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/read-error", () => ({ reportReadError: vi.fn(async () => {}) }));

import { reportReadError } from "@/lib/observability/read-error";
import { readFollowup, readFollowups } from "./followup-queries";

type Result = { data: unknown; error: { code?: string; message?: string } | null };

/** A query builder that answers the same way however it is chained. */
function client(result: Result | Error) {
  const answer = () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "not", "eq", "order"]) chain[name] = () => chain;
  chain.limit = answer;
  chain.maybeSingle = answer;
  return { from: () => chain } as never;
}

describe("readFollowups", () => {
  it("returns the dated rows, parsed", async () => {
    const rows = await readFollowups(
      client({ data: [{ conversation_id: "c1", due_on: "2026-10-13", note: "ring" }, { conversation_id: "bad", due_on: "x" }], error: null }),
    );
    expect(rows).toEqual([{ conversationId: "c1", dueOn: "2026-10-13", note: "ring" }]);
  });

  it("an empty table is an empty list, not a failure", async () => {
    expect(await readFollowups(client({ data: [], error: null }))).toEqual([]);
  });

  it("a failed read is null, never an empty list, and is reported", async () => {
    vi.mocked(reportReadError).mockClear();
    expect(await readFollowups(client({ data: null, error: { code: "42501", message: "denied" } }))).toBeNull();
    expect(reportReadError).toHaveBeenCalledTimes(1);
  });

  it("a table that does not exist yet is null and is not reported on every load", async () => {
    vi.mocked(reportReadError).mockClear();
    expect(await readFollowups(client({ data: null, error: { code: "42P01" } }))).toBeNull();
    expect(await readFollowups(client({ data: null, error: { code: "PGRST205" } }))).toBeNull();
    expect(reportReadError).not.toHaveBeenCalled();
  });

  it("a throw is null", async () => {
    expect(await readFollowups(client(new Error("network")))).toBeNull();
  });
});

describe("readFollowup", () => {
  it("returns this thread's follow-up", async () => {
    expect(await readFollowup(client({ data: { conversation_id: "c1", due_on: "2026-10-20", note: null }, error: null }), "c1")).toEqual({
      conversationId: "c1",
      dueOn: "2026-10-20",
      note: null,
    });
  });

  it("no row, a cleared row and a failure are all null", async () => {
    expect(await readFollowup(client({ data: null, error: null }), "c1")).toBeNull();
    expect(await readFollowup(client({ data: { conversation_id: "c1", due_on: null, note: null }, error: null }), "c1")).toBeNull();
    expect(await readFollowup(client({ data: null, error: { code: "XX000" } }), "c1")).toBeNull();
    expect(await readFollowup(client(new Error("boom")), "c1")).toBeNull();
  });
});
