import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDataExport, OWNED_TABLES, type ExportClient } from "./export";

/**
 * OPS-12: the export reads every owned table through the member's own client,
 * filtered to the member's id; follows wallets to their entries and assistant
 * conversations to their messages; records a refused table rather than
 * failing; pages past PostgREST's thousand-row cap.
 */
const ME = "957b3bd2-cce3-425d-bba9-5cd876ca3d62";
const OTHER = "03f3dd52-ea28-4852-9abe-e5b0a67c2a43";

type Call = { table: string; op: "eq" | "in"; column: string; value: string | string[]; from: number; to: number };

function fakeClient(data: Record<string, Record<string, unknown>[]>, refuse: string[] = []) {
  const calls: Call[] = [];
  const client: ExportClient = {
    from: (table) => ({
      select: () => ({
        eq: (column, value) => ({
          range: async (from, to) => {
            calls.push({ table, op: "eq", column, value, from, to });
            if (refuse.includes(table)) return { data: null, error: { code: "42501" } };
            const rows = (data[table] ?? []).filter((r) => r[column] === value);
            return { data: rows.slice(from, to + 1), error: null };
          },
        }),
        in: (column, values) => ({
          range: async (from, to) => {
            calls.push({ table, op: "in", column, value: values, from, to });
            const rows = (data[table] ?? []).filter((r) => values.includes(r[column] as string));
            return { data: rows.slice(from, to + 1), error: null };
          },
        }),
      }),
    }),
  };
  return { client, calls };
}

describe("the member's data export", () => {
  it("reads only the member's rows, table by table, through the owner column", async () => {
    const { client, calls } = fakeClient({
      bookings: [
        { id: "b1", guest_id: ME },
        { id: "b2", guest_id: OTHER },
      ],
      profiles: [{ id: ME, display_name: "Me" }, { id: OTHER }],
    });
    const out = await buildDataExport(client, { id: ME, email: "me@example.invalid" }, new Date("2026-09-24T00:00:00Z"));
    expect(out.tables["bookings"]).toEqual({ rows: [{ id: "b1", guest_id: ME }] });
    expect(out.profile).toEqual({ rows: [{ id: ME, display_name: "Me" }] });
    expect(out.account).toEqual({ id: ME, email: "me@example.invalid", createdAt: null });
    for (const { table, column } of OWNED_TABLES) {
      expect(calls.some((c) => c.table === table && c.op === "eq" && c.column === column && c.value === ME)).toBe(true);
    }
    expect(calls.filter((c) => c.op === "eq").every((c) => c.value === ME)).toBe(true);
  });

  it("follows wallets to their entries and conversations to their messages, never anyone else's", async () => {
    const { client } = fakeClient({
      wallets: [{ id: "w1", user_id: ME }, { id: "w2", user_id: OTHER }],
      wallet_entries: [{ id: "e1", wallet_id: "w1" }, { id: "e2", wallet_id: "w2" }],
      ai_conversations: [{ id: "c1", user_id: ME }],
      ai_messages: [{ id: "m1", conversation_id: "c1" }, { id: "m2", conversation_id: "c9" }],
    });
    const out = await buildDataExport(client, { id: ME });
    expect(out.tables["wallet_entries"]).toEqual({ rows: [{ id: "e1", wallet_id: "w1" }] });
    expect(out.tables["ai_messages"]).toEqual({ rows: [{ id: "m1", conversation_id: "c1" }] });
  });

  it("records a refused table and still returns the rest", async () => {
    const { client } = fakeClient({ saved_items: [{ id: "s1", user_id: ME }] }, ["agent_applications"]);
    const out = await buildDataExport(client, { id: ME });
    expect(out.tables["agent_applications"]).toEqual({ unavailable: "42501" });
    expect(out.tables["saved_items"]).toEqual({ rows: [{ id: "s1", user_id: ME }] });
  });

  it("pages past the thousand-row cap", async () => {
    const many = Array.from({ length: 2500 }, (_, i) => ({ id: `n${i}`, user_id: ME }));
    const { client } = fakeClient({ notifications: many });
    const out = await buildDataExport(client, { id: ME });
    const t = out.tables["notifications"];
    expect(t && "rows" in t ? t.rows.length : 0).toBe(2500);
  });

  it("names what it leaves out", async () => {
    const { client } = fakeClient({});
    const out = await buildDataExport(client, { id: ME });
    expect(out.notIncluded.map((n) => n.what).join(" ")).toContain("known_devices");
    expect(out.format).toBe("vallo.data-export.v1");
  });
});
