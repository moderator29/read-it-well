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

describe("STORE-19: the 18-or-over statement", () => {
  it("is written as its own row beside the terms receipt", async () => {
    const { recordTermsAcceptance, AGE_DOCUMENT, AGE_VERSION } = await import("./acceptance");
    await recordTermsAcceptance("u1", "signup_email", { ageConfirmed: true });
    const rows = seam.upsert.mock.calls.flatMap((call) => call[0] as { document: string; version: string }[]);
    expect(rows).toContainEqual(expect.objectContaining({ user_id: "u1", document: AGE_DOCUMENT, version: AGE_VERSION }));
    expect(rows.map((row) => row.document)).toEqual(expect.arrayContaining(["terms", "privacy"]));
  });

  it("a failed age row never costs the terms receipt, and raises an alert", async () => {
    const { recordTermsAcceptance, AGE_DOCUMENT } = await import("./acceptance");
    seam.upsert.mockImplementation(async (rows: { document: string }[]) =>
      rows.some((row) => row.document === AGE_DOCUMENT) ? { error: { message: "check" } } : { error: null },
    );
    await recordTermsAcceptance("u1", "signup_email", { ageConfirmed: true });
    expect(seam.upsert).toHaveBeenCalledTimes(2);
    expect(seam.alert).toHaveBeenCalledTimes(1);
  });

  it("is not written when the person did not make it", async () => {
    const { recordTermsAcceptance, AGE_DOCUMENT } = await import("./acceptance");
    await recordTermsAcceptance("u1", "signup_email");
    const rows = seam.upsert.mock.calls.flatMap((call) => call[0] as { document: string }[]);
    expect(rows.some((row) => row.document === AGE_DOCUMENT)).toBe(false);
  });
});
