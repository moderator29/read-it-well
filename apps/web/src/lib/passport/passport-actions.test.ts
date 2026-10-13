import { beforeEach, describe, expect, it, vi } from "vitest";

const upserts: { table: string; row: Record<string, unknown>; options: unknown }[] = [];
let state: "signed-in" | "signed-out" | "unconfigured" = "signed-in";
let upsertError: unknown = null;

const supabase = {
  from: (table: string) => ({
    upsert: async (row: Record<string, unknown>, options: unknown) => {
      upserts.push({ table, row, options });
      return { error: upsertError };
    },
  }),
};

vi.mock("@/lib/actions/session", () => ({
  NOT_CONFIGURED_MESSAGE: "not configured",
  resolveSession: async () =>
    state === "signed-in" ? { state, supabase, user: { id: "u1" } } : { state },
}));
vi.mock("@/lib/locale", () => ({ getLocale: async () => "en" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  upserts.length = 0;
  state = "signed-in";
  upsertError = null;
});

describe("saving the passport switches", () => {
  it("writes the member's own row: whole switch and hidden lines, in drawing order", async () => {
    const { savePassportSettings } = await import("./passport-actions");
    const result = await savePassportSettings({ enabled: true, hidden: ["reviews", "photo", "photo"] });
    expect(result).toEqual({ ok: true, data: { enabled: true, hidden: ["photo", "reviews"] } });
    expect(upserts).toHaveLength(1);
    expect(upserts[0]!.table).toBe("passport_settings");
    expect(upserts[0]!.row).toMatchObject({ user_id: "u1", enabled: true, hidden_lines: ["photo", "reviews"] });
    expect(upserts[0]!.options).toEqual({ onConflict: "user_id" });
  });

  it("can turn the whole passport off", async () => {
    const { savePassportSettings } = await import("./passport-actions");
    const result = await savePassportSettings({ enabled: false, hidden: [] });
    expect(result.ok && result.data.enabled).toBe(false);
    expect(upserts[0]!.row).toMatchObject({ enabled: false, hidden_lines: [] });
  });

  it("always writes the caller's own id, whatever the request says", async () => {
    const { savePassportSettings } = await import("./passport-actions");
    await savePassportSettings({ enabled: true, hidden: [], user_id: "somebody-else", userId: "somebody-else" });
    expect(upserts[0]!.row.user_id).toBe("u1");
  });

  it("refuses a line the passport does not have, and writes nothing", async () => {
    const { savePassportSettings } = await import("./passport-actions");
    for (const hidden of [["phone"], ["email"], ["photo", "date_of_birth"]]) {
      const result = await savePassportSettings({ enabled: true, hidden });
      expect(result.ok).toBe(false);
    }
    expect((await savePassportSettings({ hidden: [] })).ok).toBe(false);
    expect(upserts).toEqual([]);
  });

  it("says so when signed out, and writes nothing", async () => {
    state = "signed-out";
    const { savePassportSettings } = await import("./passport-actions");
    const result = await savePassportSettings({ enabled: true, hidden: [] });
    expect(result).toMatchObject({ ok: false, error: "Sign in to use your passport." });
    expect(upserts).toEqual([]);
  });

  it("says the change was not saved when the database refuses", async () => {
    upsertError = { code: "42501", message: "denied" };
    const { savePassportSettings } = await import("./passport-actions");
    expect(await savePassportSettings({ enabled: false, hidden: [] })).toMatchObject({
      ok: false,
      error: "That change was not saved. Try again.",
    });
  });
});
