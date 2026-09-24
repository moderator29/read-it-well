import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildDataExport, CHILD_TABLES, OWNED_TABLES, PARTY_KEYS, STAFF_KEYS, type ExportClient } from "./export";

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

  it("carries no staff identity on any row, while keeping the decision and its reason", async () => {
    const staff = { reviewer_id: OTHER, reviewed_by: OTHER, resolved_by: OTHER, decided_by: OTHER, verified_by: OTHER };
    const { client } = fakeClient({
      agent_applications: [{ id: "a1", user_id: ME, status: "rejected", review_notes: "ID photo unreadable", ...staff }],
      agent_documents: [{ id: "d1", uploader_id: ME, ...staff }],
      businesses: [{ id: "biz1", owner_id: ME, ...staff }],
      reports: [{ id: "r1", reporter_id: ME, ...staff }],
      escrows: [{ id: "e1", payer_id: ME, payee_id: OTHER, resolution_note: "refunded", ...staff }],
      agents: [{ id: "ag1", user_id: ME }],
      listings: [{ id: "l1", agent_id: "ag1", supply_verified_by: OTHER, ...staff }],
      accommodations: [{ id: "acc1", business_id: "biz1", ...staff }],
      profiles: [{ id: ME, ...staff }],
    });
    const out = await buildDataExport(client, { id: ME });
    const rows = [
      ...(out.profile && "rows" in out.profile ? out.profile.rows : []),
      ...Object.values(out.tables).flatMap((t) => ("rows" in t ? t.rows : [])),
    ];
    expect(rows.length).toBeGreaterThan(8);
    for (const row of rows) {
      const leaked = Object.keys(row).filter((k) => STAFF_KEYS.has(k));
      expect(leaked, JSON.stringify(row)).toEqual([]);
    }
    expect(out.tables["agent_applications"]).toEqual({
      rows: [{ id: "a1", user_id: ME, status: "rejected", review_notes: "ID photo unreadable" }],
    });
    expect(out.tables["escrows_as_payer"]).toEqual({ rows: [{ id: "e1", payer_id: ME, payee_id: OTHER, resolution_note: "refunded" }] });
  });

  it("classifies every staff-looking column of every exported table (a new *_by column fails here)", () => {
    const types = readFileSync(join(__dirname, "..", "supabase", "database.types.ts"), "utf8");
    const exported = new Set(["profiles", ...OWNED_TABLES.map((t) => t.table), ...CHILD_TABLES.map((t) => t.table)]);
    const unclassified: string[] = [];
    let checked = 0;
    for (const table of exported) {
      const m = types.match(new RegExp(`\\n {6}${table}: \\{\\n {8}Row: \\{\\n([\\s\\S]*?)\\n {8}\\}`));
      if (!m?.[1]) continue;
      checked++;
      for (const line of m[1].split("\n")) {
        const col = line.trim().split(":")[0] ?? "";
        if (!/(_by|reviewer_id)$/.test(col) || col === "check_out_by") continue;
        if (!STAFF_KEYS.has(col) && !PARTY_KEYS.has(col)) unclassified.push(`${table}.${col}`);
      }
    }
    expect(checked).toBeGreaterThan(40);
    expect(unclassified).toEqual([]);
  });

  it("covers payments, escrows and the supplier side, as payer and payee, guest and host", async () => {
    const { client } = fakeClient({
      bookings: [{ id: "b1", guest_id: ME }],
      transactions: [{ id: "t1", booking_id: "b1" }, { id: "t2", booking_id: "b9" }],
      escrows: [{ id: "e1", payer_id: ME }, { id: "e2", payee_id: ME }, { id: "e3", payer_id: OTHER }],
      conversations: [{ id: "c1", guest_id: ME }, { id: "c2", agent_id: ME, guest_id: OTHER }],
      agents: [{ id: "ag1", user_id: ME }],
      listings: [{ id: "l1", agent_id: "ag1" }, { id: "l2", agent_id: "ag9" }],
      listing_photos: [{ id: "p1", listing_id: "l1" }],
      businesses: [{ id: "biz1", owner_id: ME }],
      accommodations: [{ id: "acc1", business_id: "biz1" }],
      business_documents: [{ id: "bd1", business_id: "biz1" }, { id: "bd2", business_id: "biz9" }],
    });
    const out = await buildDataExport(client, { id: ME });
    const ids = (k: string) => {
      const t = out.tables[k];
      return t && "rows" in t ? t.rows.map((r) => r["id"]) : null;
    };
    expect(ids("transactions")).toEqual(["t1"]);
    expect(ids("escrows_as_payer")).toEqual(["e1"]);
    expect(ids("escrows_as_payee")).toEqual(["e2"]);
    expect(ids("conversations")).toEqual(["c1"]);
    expect(ids("conversations_as_host")).toEqual(["c2"]);
    expect(ids("listings")).toEqual(["l1"]);
    expect(ids("listing_photos")).toEqual(["p1"]);
    expect(ids("accommodations")).toEqual(["acc1"]);
    expect(ids("business_documents")).toEqual(["bd1"]);
    expect(out.notIncluded.map((n) => n.what).join(" ")).toContain("Messages you received");
  });
});
