import { describe, expect, it } from "vitest";
import {
  LISTING_PRIVATE_COLUMNS,
  PRIVATE_FIELDS_CHUNK,
  PrivateFieldsUnavailable,
  withBusinessPrivate,
  withListingPrivate,
  withoutColumns,
} from "./private-fields";

function rpcClient(result: { data: unknown; error: unknown }) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const client = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return result;
    },
  };
  return { client: client as never, calls };
}

describe("withoutColumns", () => {
  it("drops the top-level private columns and leaves an embed's own columns", () => {
    const select = "id, title, address, landmark, estates(name, address), review_notes, reviewer_id, city";
    const out = withoutColumns(select, LISTING_PRIVATE_COLUMNS);
    expect(out.split(/,(?![^(]*\))/).map((c) => c.trim())).toEqual(["id", "title", "estates(name, address)", "city"]);
  });
});

describe("withListingPrivate", () => {
  it("asks once for the distinct ids and merges each row's fields", async () => {
    const { client, calls } = rpcClient({
      data: [{ id: "a", address: "1 Road", landmark: "Gate", review_notes: "ok", reviewer_id: "r" }],
      error: null,
    });
    const rows = await withListingPrivate(client, [{ id: "a" }, { id: "b" }, { id: "a" }]);
    expect(calls).toEqual([{ fn: "listing_private_fields", args: { p_ids: ["a", "b"] } }]);
    expect(rows[0]).toMatchObject({ id: "a", address: "1 Road", landmark: "Gate" });
    expect(rows[1]).toMatchObject({ id: "b", address: null, landmark: null, review_notes: null, reviewer_id: null });
  });

  it("asks in chunks the function accepts", async () => {
    const { client, calls } = rpcClient({ data: [], error: null });
    const rows = Array.from({ length: PRIVATE_FIELDS_CHUNK * 2 + 1 }, (_, i) => ({ id: `id-${i}` }));
    await withListingPrivate(client, rows);
    expect(calls.map((c) => (c.args.p_ids as string[]).length)).toEqual([PRIVATE_FIELDS_CHUNK, PRIVATE_FIELDS_CHUNK, 1]);
  });

  it("does not call the database for no rows", async () => {
    const { client, calls } = rpcClient({ data: [], error: null });
    expect(await withListingPrivate(client, [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it("throws rather than merging blanks when the call fails", async () => {
    const { client } = rpcClient({ data: null, error: { message: "function does not exist" } });
    await expect(withListingPrivate(client, [{ id: "a" }])).rejects.toBeInstanceOf(PrivateFieldsUnavailable);
  });
});

describe("withBusinessPrivate", () => {
  it("merges only the keys asked for", async () => {
    const { client } = rpcClient({ data: [{ id: "b", tin: "123", phone: "+234", verification_tier: 2 }], error: null });
    const [row] = await withBusinessPrivate(client, [{ id: "b", name: "Inn" }], ["verification_tier"] as const);
    expect(row).toEqual({ id: "b", name: "Inn", verification_tier: 2 });
  });
});
