import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * THE REPORT, EXERCISED OVER THE REAL ACTIONS.
 *
 * This box cannot reach Supabase over HTTP, so the live run is impossible
 * here. What can be proved is that the screen's calls go through the
 * real `saveInspectionReport` with the shapes the tables take, that the database's refusals come back as the
 * sentences the screen shows, and that `fromSaved` turns what the action read
 * back into the ticks the screen draws. The database end (RLS, the eight-tick
 * trigger, the bucket) was confirmed read-only on production.
 */

const session = vi.hoisted(() => ({ resolveSession: vi.fn() }));
vi.mock("../actions/session", () => session);
vi.mock("../messages/actions", () => ({ startConversation: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("server-only", () => ({}));

const { saveInspectionReport } = await import("./actions");
const { fromSaved, ROOM_ITEMS } = await import("./report");

const USER = "11111111-1111-4111-8111-111111111111";
const ID = "44444444-4444-4444-8444-444444444444";

type Answer = { data: unknown; error: unknown };
type Write = { table: string; op: string; payload: unknown; options?: unknown };

/** A client that records every write and answers reads from a small store. */
function mount(opts: { refuse?: Record<string, string> } = {}) {
  const writes: Write[] = [];
  const store = { report: null as null | Record<string, unknown>, items: new Map<string, Record<string, unknown>>() };
  const client = {
    from(table: string) {
      let op = "select";
      let payload: unknown = null;
      const chain: Record<string, unknown> = {};
      const settle = (): Answer => {
        const refused = opts.refuse?.[`${table}:${op}`];
        if (refused) return { data: null, error: { message: refused } };
        if (op === "select") {
          if (table === "inspection_reports") return { data: store.report ? [store.report] : [], error: null };
          if (table === "inspection_report_items") return { data: [...store.items.values()], error: null };
          return { data: [], error: null };
        }
        return { data: null, error: null };
      };
      for (const method of ["select", "eq", "is", "in"]) chain[method] = () => chain;
      const write = (name: string) => (value: unknown, options?: unknown) => {
        op = name;
        payload = value;
        writes.push({ table, op: name, payload: value, options });
        if (table === "inspection_reports" && name === "upsert") {
          store.report = { inspection_id: ID, notes: (value as { notes: string | null }).notes, submitted_at: null };
        }
        if (table === "inspection_reports" && name === "update" && store.report) {
          store.report = { ...store.report, ...(value as Record<string, unknown>) };
        }
        if (table === "inspection_report_items" && name === "upsert") {
          for (const row of value as Record<string, unknown>[]) store.items.set(String(row.item), row);
        }
        return chain;
      };
      chain["upsert"] = write("upsert");
      chain["update"] = write("update");
      chain["insert"] = write("insert");
      chain["then"] = (resolve: (value: Answer) => unknown) => Promise.resolve(settle()).then(resolve);
      void payload;
      return chain;
    },
  };
  session.resolveSession.mockResolvedValue({ state: "signed-in", user: { id: USER }, supabase: client });
  return { writes, store };
}

beforeEach(() => {
  session.resolveSession.mockReset();
  delete process.env.VALLO_INSPECTION_REPORTS;
});

describe("ticking a room", () => {
  it("writes the report row and the item, and the screen draws the tick from what was read back", async () => {
    const { writes } = mount();
    const result = await saveInspectionReport({
      inspectionId: ID,
      items: [{ item: "kitchen", checked: true }],
      notes: "Gate sticks.",
      submit: false,
    });
    expect(result.ok).toBe(true);
    expect(writes.map((w) => `${w.table}:${w.op}`)).toEqual([
      "inspection_reports:upsert",
      "inspection_reports:update",
      "inspection_report_items:upsert",
    ]);
    const item = (writes[2]!.payload as Record<string, unknown>[])[0]!;
    expect(item).toMatchObject({ inspection_id: ID, item: "kitchen", checked: true });
    expect(typeof item.checked_at).toBe("string");
    if (result.ok) {
      const view = fromSaved(result.data, 0);
      expect(view.items).toEqual({ kitchen: true });
      expect(view.notes).toBe("Gate sticks.");
    }
  });

  it("unticking clears the stamp", async () => {
    const { writes } = mount();
    await saveInspectionReport({ inspectionId: ID, items: [{ item: "kitchen", checked: false }], notes: null, submit: false });
    const item = (writes[2]!.payload as Record<string, unknown>[])[0]!;
    expect(item.checked_at).toBeNull();
  });

  it("creates the report once and never re-authors it: the notes are written on their own", async () => {
    const { writes } = mount();
    await saveInspectionReport({ inspectionId: ID, items: [], notes: "Damp by the window.", submit: false });
    const [create, notes] = writes;
    expect(create).toMatchObject({ table: "inspection_reports", op: "upsert", payload: { author_id: USER } });
    expect(create!.options).toMatchObject({ onConflict: "inspection_id", ignoreDuplicates: true });
    expect(notes).toMatchObject({ table: "inspection_reports", op: "update", payload: { notes: "Damp by the window." } });
    expect(notes!.payload).not.toHaveProperty("author_id");
  });

  it("I5: a save without notes writes notes as null, which is why the screen sends them every time", async () => {
    const { writes } = mount();
    await saveInspectionReport({ inspectionId: ID, items: [{ item: "safety", checked: true }], submit: false });
    expect((writes[0]!.payload as { notes: unknown }).notes).toBeNull();
  });
});

describe("submitting", () => {
  it("stamps submitted_at in the same call once the rooms are sent", async () => {
    const { writes } = mount();
    const all = ROOM_ITEMS.map((item) => ({ item, checked: true }));
    const result = await saveInspectionReport({ inspectionId: ID, items: all, notes: null, submit: true });
    expect(result.ok).toBe(true);
    const last = writes.at(-1)!;
    expect(last.table).toBe("inspection_reports");
    expect(last.op).toBe("update");
    expect(typeof (last.payload as { submitted_at: unknown }).submitted_at).toBe("string");
  });

  it("the database's eight-tick refusal comes back as the sentence the screen shows", async () => {
    mount({ refuse: { "inspection_reports:update": "a report is submitted only when all eight rooms are checked" } });
    const result = await saveInspectionReport({ inspectionId: ID, items: [], notes: null, submit: true });
    expect(result).toEqual({ ok: false, error: "Tick all eight rooms before you submit the report." });
  });

  it("a rental report short of photos says how many more, before it is locked", async () => {
    mount({
      refuse: {
        "inspection_reports:update": "an inspection report for a rental is submitted with at least 3 photos, and 1 are attached",
      },
    });
    const result = await saveInspectionReport({ inspectionId: ID, items: [], notes: null, submit: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Add at least 3 photos taken at the property before you submit. 1 added so far.");
  });

  it("a closed or submitted report refuses as a state, not a permission", async () => {
    mount({ refuse: { "inspection_reports:upsert": "new row violates row-level security policy" } });
    const result = await saveInspectionReport({ inspectionId: ID, items: [], notes: null, submit: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/cannot be changed now/);
  });
});
