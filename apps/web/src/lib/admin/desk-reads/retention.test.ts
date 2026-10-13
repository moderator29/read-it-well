import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The retention tool (pending migration ac01). Destruction needs a super
 * admin, the typed phrase and the count the person was shown; every refusal
 * leaves the records alone, and a database that does not have the functions
 * yet is said plainly instead of drawn as an empty list.
 */
const seam = vi.hoisted(() => ({
  access: { state: "admin" } as Record<string, unknown>,
  calls: [] as { fn: string; args?: Record<string, unknown> }[],
  answer: { data: null as unknown, error: null as { code?: string } | null },
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => seam.revalidated.push(path) }));
vi.mock("../guard", () => ({
  ADMIN_FORBIDDEN_MESSAGE: "forbidden",
  adminRefusal: () => "refused",
  requireAdmin: async () =>
    seam.access["state"] === "admin"
      ? {
          state: "admin",
          isStaff: false,
          isSuperAdmin: true,
          userClient: {
            rpc: async (fn: string, args?: Record<string, unknown>) => {
              seam.calls.push({ fn, ...(args ? { args } : {}) });
              return seam.answer;
            },
          },
          ...seam.access,
        }
      : seam.access,
}));

const { RETENTION_PHRASE, confirmationMatches, parseDestroyAnswer, parseRetentionPreview } = await import("./retention");
const { readRetention, isMissingFunction } = await import("./retention-read");
const { destroyExpiredMoneyRecords } = await import("./retention-actions");

const PREVIEW = {
  due: 2,
  kept: 5,
  next_due: "2027-01-01T00:00:00Z",
  bank_accounts: 3,
  payout_accounts: 1,
  wallet_entries: 4,
  rows: [
    { request_id: "11111111-1111-1111-1111-111111111111", retain_until: "2026-09-01T00:00:00Z", bank_accounts: 2, payout_accounts: 0, payout_held: true, wallet_entries: 4 },
    { request_id: "22222222-2222-2222-2222-222222222222", retain_until: "2026-09-02T00:00:00Z", bank_accounts: 1, payout_accounts: 1, payout_held: false, wallet_entries: 0 },
  ],
};

beforeEach(() => {
  seam.access = { state: "admin" };
  seam.calls = [];
  seam.answer = { data: null, error: null };
  seam.revalidated = [];
});

describe("the confirmation phrase", () => {
  it("matches exactly: capitals, nothing around it", () => {
    expect(RETENTION_PHRASE).toBe("DESTROY");
    expect(confirmationMatches("DESTROY")).toBe(true);
    for (const typed of ["destroy", "Destroy", " DESTROY", "DESTROY ", "DESTROY IT", ""]) {
      expect(confirmationMatches(typed), typed).toBe(false);
    }
  });
});

describe("parseRetentionPreview", () => {
  it("reads the dry run and carries no name, number or user id", () => {
    const preview = parseRetentionPreview(PREVIEW)!;
    expect(preview).toMatchObject({ due: 2, kept: 5, bankAccounts: 3, nextDue: "2027-01-01T00:00:00Z" });
    expect(preview.rows[0]).toMatchObject({ payoutHeld: true, walletEntries: 4 });
    expect(Object.keys(preview.rows[0]!).sort()).toEqual(["bankAccounts", "payoutAccounts", "payoutHeld", "requestId", "retainUntil", "walletEntries"]);
  });

  it("refuses a malformed answer rather than guessing a count", () => {
    expect(parseRetentionPreview(null)).toBeNull();
    expect(parseRetentionPreview({ due: 1 })).toBeNull();
    expect(parseRetentionPreview({ ...PREVIEW, rows: [{ request_id: 1 }] })).toBeNull();
    expect(parseRetentionPreview({ ...PREVIEW, due: -1 })).toBeNull();
  });
});

describe("parseDestroyAnswer", () => {
  it("knows the five answers and nothing else", () => {
    for (const status of ["ok", "nothing_due", "changed", "confirm", "forbidden"]) {
      expect(parseDestroyAnswer({ status, redacted: 2 })?.status).toBe(status);
    }
    expect(parseDestroyAnswer({ status: "maybe" })).toBeNull();
    expect(parseDestroyAnswer(null)).toBeNull();
  });
});

describe("readRetention", () => {
  it("asks for the dry run on the operator's client and offers destruction only to a super admin", async () => {
    seam.answer = { data: PREVIEW, error: null };
    const read = await readRetention();
    expect(seam.calls).toEqual([{ fn: "staff_money_retention_preview" }]);
    expect(read.state === "ok" && read.canDestroy).toBe(true);
    seam.access = { state: "admin", isSuperAdmin: false };
    const second = await readRetention();
    expect(second.state === "ok" && second.canDestroy).toBe(false);
  });

  it("says plainly that the functions are not installed yet", async () => {
    expect(isMissingFunction({ code: "PGRST202" })).toBe(true);
    expect(isMissingFunction({ code: "42883" })).toBe(true);
    expect(isMissingFunction({ code: "42501" })).toBe(false);
    seam.answer = { data: null, error: { code: "PGRST202" } };
    expect(await readRetention()).toEqual({ state: "not_installed" });
  });

  it("is forbidden for the refused and for a member the function refuses; unavailable otherwise", async () => {
    seam.access = { state: "not-admin" };
    expect(await readRetention()).toEqual({ state: "forbidden" });
    seam.access = { state: "admin" };
    seam.answer = { data: null, error: { code: "42501" } };
    expect(await readRetention()).toEqual({ state: "forbidden" });
    seam.answer = { data: null, error: { code: "XX000" } };
    expect(await readRetention()).toEqual({ state: "unavailable" });
    seam.answer = { data: { garbage: true }, error: null };
    expect(await readRetention()).toEqual({ state: "unavailable" });
  });
});

describe("destroyExpiredMoneyRecords", () => {
  const good = { confirm: "DESTROY", expected: 2 };

  it("refuses anybody but a super admin, before any call", async () => {
    seam.access = { state: "not-admin" };
    expect((await destroyExpiredMoneyRecords(good)).ok).toBe(false);
    seam.access = { state: "admin", isSuperAdmin: false };
    expect((await destroyExpiredMoneyRecords(good)).ok).toBe(false);
    seam.access = { state: "admin", isStaff: true };
    expect((await destroyExpiredMoneyRecords(good)).ok).toBe(false);
    expect(seam.calls).toEqual([]);
  });

  it("never lets a wrong phrase or a missing count leave the server", async () => {
    for (const input of [{ confirm: "destroy", expected: 2 }, { confirm: "DESTROY", expected: 0 }, { confirm: "DESTROY" }, { expected: 2 }]) {
      expect((await destroyExpiredMoneyRecords(input)).ok).toBe(false);
    }
    expect(seam.calls).toEqual([]);
  });

  it("sends the phrase and the shown count, and reports what was destroyed", async () => {
    seam.answer = { data: { status: "ok", redacted: 2 }, error: null };
    const result = await destroyExpiredMoneyRecords(good);
    expect(result).toEqual({ ok: true, data: { redacted: 2 } });
    expect(seam.calls).toEqual([
      { fn: "staff_destroy_expired_money_records", args: { p_limit: 500, p_confirm: "DESTROY", p_expected: 2 } },
    ]);
    expect(seam.revalidated).toEqual(["/admin/retention"]);
  });

  it("says nothing was due, and says the list changed, without ever claiming a destruction", async () => {
    seam.answer = { data: { status: "nothing_due" }, error: null };
    expect(await destroyExpiredMoneyRecords(good)).toEqual({ ok: true, data: { nothingDue: true } });
    seam.answer = { data: { status: "changed", due: 3 }, error: null };
    const changed = await destroyExpiredMoneyRecords(good);
    expect(changed.ok).toBe(false);
    expect(changed.ok ? "" : changed.error).toMatch(/Nothing was destroyed/);
  });

  it("fails closed on a refusal, an error, or an answer it does not know", async () => {
    for (const data of [{ status: "forbidden" }, { status: "confirm" }, { status: "maybe" }, null]) {
      seam.answer = { data, error: null };
      expect((await destroyExpiredMoneyRecords(good)).ok).toBe(false);
    }
    seam.answer = { data: null, error: { code: "XX000" } };
    expect((await destroyExpiredMoneyRecords(good)).ok).toBe(false);
  });
});
