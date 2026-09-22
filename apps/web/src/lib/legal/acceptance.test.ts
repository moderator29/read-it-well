import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The receipt for an acceptance.
 *
 * Nobody's acceptance had ever been recorded: the sign-up form carried a
 * version string, the auth metadata carried it onward, and `public.profiles`
 * has no column to put it in. These prove the writer that closes it: both
 * documents are recorded with the versions this build actually serves, a
 * repeat is ignored rather than overwriting the original date, and a failure
 * raises a risk alert rather than disappearing, because a missing compliance
 * record that nobody knows is missing is the worst of the three outcomes.
 */
const seam = vi.hoisted(() => ({
  upsert: vi.fn(),
  alert: vi.fn(),
}));

vi.mock("@/lib/alerts", () => ({ recordAlert: seam.alert }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ upsert: seam.upsert }) }),
}));

beforeEach(() => {
  seam.upsert.mockReset();
  seam.alert.mockReset();
  seam.upsert.mockResolvedValue({ error: null });
  seam.alert.mockResolvedValue({ ok: true });
});

describe("recording an acceptance", () => {
  it("writes one row per document, at the versions this build serves", async () => {
    const { recordTermsAcceptance } = await import("./acceptance");
    const { TERMS_VERSION, PRIVACY_VERSION } = await import("./versions");

    await recordTermsAcceptance("11111111-1111-4111-8111-111111111111", "signup_email");

    expect(seam.upsert).toHaveBeenCalledTimes(1);
    const [rows] = seam.upsert.mock.calls[0] as [
      { user_id: string; document: string; version: string; source: string }[],
    ];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.document).sort()).toEqual(["privacy", "terms"]);
    expect(rows.find((row) => row.document === "terms")?.version).toBe(TERMS_VERSION);
    expect(rows.find((row) => row.document === "privacy")?.version).toBe(PRIVACY_VERSION);
    expect(rows.every((row) => row.source === "signup_email")).toBe(true);
    expect(rows.every((row) => row.user_id === "11111111-1111-4111-8111-111111111111")).toBe(true);
  });

  it("ignores a duplicate rather than restamping the original date", async () => {
    const { recordTermsAcceptance } = await import("./acceptance");

    await recordTermsAcceptance("11111111-1111-4111-8111-111111111111", "reacceptance");

    const [, options] = seam.upsert.mock.calls[0] as [unknown, { onConflict: string; ignoreDuplicates: boolean }];
    expect(options.onConflict).toBe("user_id,document,version");
    expect(options.ignoreDuplicates).toBe(true);
  });

  it("raises an alert when the row cannot be written, and never throws", async () => {
    seam.upsert.mockResolvedValue({ error: { message: "permission denied" } });
    const { recordTermsAcceptance } = await import("./acceptance");

    await expect(
      recordTermsAcceptance("11111111-1111-4111-8111-111111111111", "signup_email"),
    ).resolves.toBeUndefined();

    expect(seam.alert).toHaveBeenCalledTimes(1);
    const [raised] = seam.alert.mock.calls[0] as [{ kind: string; subjectId: string }];
    expect(raised.kind).toBe("legal.acceptance.unrecorded");
    expect(raised.subjectId).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("does nothing at all without a user id", async () => {
    const { recordTermsAcceptance } = await import("./acceptance");

    await recordTermsAcceptance("", "signup_email");

    expect(seam.upsert).not.toHaveBeenCalled();
    expect(seam.alert).not.toHaveBeenCalled();
  });
});
