import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  calls: [] as { fn: string; args: Record<string, unknown> }[],
  data: [] as Record<string, unknown>[] | null,
  error: null as unknown,
  signedIn: true,
}));

vi.mock("../actions/session", () => ({
  resolveSession: async () =>
    state.signedIn
      ? {
          state: "signed-in",
          supabase: {
            rpc: async (fn: string, args: Record<string, unknown>) => {
              state.calls.push({ fn, args });
              return { data: state.data, error: state.error };
            },
          },
        }
      : { state: "signed-out" },
}));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  state.calls = [];
  state.data = [];
  state.error = null;
  state.signedIn = true;
});

describe("readMemberNotesFor (the Verification desk's notes, one read)", () => {
  it("reads every person's notes in ONE call and groups them", async () => {
    state.data = [
      { subject_id: A, id: "n1", body: "called them", created_at: "2026-09-29T10:00:00Z", author_name: "Ada", scope: null, mine: true },
      { subject_id: A, id: "n2", body: "sent back", created_at: "2026-09-29T09:00:00Z", author_name: "Ada", scope: "kyc_review", mine: true },
      { subject_id: B, id: "n3", body: "odd ID", created_at: "2026-09-29T08:00:00Z", author_name: "Bo", scope: "nonsense", mine: false },
    ];
    const { readMemberNotesFor, notesOf } = await import("./notes");
    const batch = await readMemberNotesFor([A, B, A, "not-a-uuid"]);
    expect(state.calls).toEqual([{ fn: "staff_member_notes_for", args: { p_subjects: [A, B] } }]);
    const a = notesOf(batch, A);
    expect(a.state === "ok" && a.notes.map((n) => n.id)).toEqual(["n1", "n2"]);
    const b = notesOf(batch, B);
    expect(b.state === "ok" && b.notes[0]!.scope).toBeNull();
    const none = notesOf(batch, "33333333-3333-4333-8333-333333333333");
    expect(none).toEqual({ state: "ok", notes: [] });
  });

  it("makes no call for nobody, and says unavailable on an error", async () => {
    const { readMemberNotesFor, notesOf } = await import("./notes");
    expect(await readMemberNotesFor([])).toEqual({ state: "ok", bySubject: new Map() });
    expect(state.calls).toHaveLength(0);
    state.error = { message: "boom" };
    const failed = await readMemberNotesFor([A]);
    expect(failed).toEqual({ state: "unavailable" });
    expect(notesOf(failed, A)).toEqual({ state: "unavailable" });
  });

  it("reads nothing signed out", async () => {
    state.signedIn = false;
    const { readMemberNotesFor } = await import("./notes");
    expect(await readMemberNotesFor([A])).toEqual({ state: "unavailable" });
  });
});
