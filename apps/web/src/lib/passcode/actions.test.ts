import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The passcode's server actions with Supabase mocked (docs/PASSCODE.md): the
 * database answers are canned, and what is checked is what the action does
 * with them. It writes the unlock only on a right code or a new code, signs
 * the browser out on the tenth wrong try, paces per user and per address, and
 * never sends a malformed code to the database at all.
 */
const s = vi.hoisted(() => ({
  signedIn: true,
  rpc: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  wrote: [] as string[],
  paced: null as null | "user" | "ip",
  consumed: [] as { bucket: string; subject: string }[],
  redirected: null as string | null,
}));

vi.mock("./state", () => ({
  readPasscodeSession: async () =>
    s.signedIn
      ? { state: "signed-in", userId: "user-1", amr: null, supabase: { rpc: s.rpc, auth: { signOut: s.signOut } } }
      : { state: "signed-out" },
  writeUnlock: async (userId: string) => {
    s.wrote.push(`unlock:${userId}`);
    return true;
  },
  clearUnlock: async () => {
    s.wrote.push("clear-unlock");
  },
  writeResetIntent: async () => {
    s.wrote.push("reset-intent");
  },
  clearResetIntent: async () => {
    s.wrote.push("clear-reset-intent");
  },
}));

vi.mock("../security/rate-limit", () => ({
  subjectForUser: (id: string) => `user:${id}`,
  subjectForIp: (ip: string) => `ip:${ip}`,
  ipFromHeaders: () => "203.0.113.9",
  consume: async (request: { bucket: string; subject: string }) => {
    s.consumed.push({ bucket: request.bucket, subject: request.subject });
    const who = request.subject.startsWith("ip:") ? "ip" : "user";
    if (s.paced === who) return { allowed: false, retryAfterSeconds: 120, retryIn: "in about 2 minutes" };
    return { allowed: true, degraded: false };
  },
}));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    s.redirected = to;
    throw new Error("NEXT_REDIRECT");
  },
}));
vi.mock("./unlock-cookie", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./unlock-cookie")>();
  return { ...actual, passcodeKey: () => actual.deriveKey("a-test-secret-that-is-long-enough", "reset") };
});

import { forgotPasscodeAction, lockPasscodeAction, setPasscodeAction, verifyPasscodeAction } from "./actions";

beforeEach(() => {
  s.signedIn = true;
  s.rpc.mockReset();
  s.signOut.mockClear();
  s.wrote = [];
  s.paced = null;
  s.consumed = [];
  s.redirected = null;
});

describe("verifyPasscodeAction", () => {
  it("writes the unlock on a right code, and only then", async () => {
    s.rpc.mockResolvedValue({ data: { status: "ok", length: 6 }, error: null });
    expect(await verifyPasscodeAction("480913")).toEqual({ status: "ok" });
    expect(s.rpc).toHaveBeenCalledWith("passcode_verify", { p_code: "480913" });
    expect(s.wrote).toEqual(["unlock:user-1"]);
  });

  it("says how many tries are left on a wrong code, and writes nothing", async () => {
    s.rpc.mockResolvedValue({ data: { status: "wrong", failed_count: 3 }, error: null });
    expect(await verifyPasscodeAction("999990")).toEqual({ status: "wrong", beforeCooldown: 2, beforeSignOut: 7 });
    expect(s.wrote).toEqual([]);
  });

  it("passes the cooldown through", async () => {
    s.rpc.mockResolvedValue({ data: { status: "cooldown", retry_after_seconds: 30, failed_count: 5 }, error: null });
    expect(await verifyPasscodeAction("999990")).toEqual({ status: "cooldown", retryAfterSeconds: 30 });
  });

  it("signs this browser out on the tenth wrong try", async () => {
    s.rpc.mockResolvedValue({ data: { status: "reset_required", failed_count: 10 }, error: null });
    expect(await verifyPasscodeAction("999990")).toEqual({ status: "signed-out" });
    expect(s.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(s.wrote).toContain("clear-unlock");
    expect(s.wrote).not.toContain("unlock:user-1");
  });

  it("treats a database failure as an error, never as unlocked", async () => {
    s.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    expect(await verifyPasscodeAction("480913")).toEqual({ status: "error" });
    s.rpc.mockRejectedValue(new Error("network"));
    expect(await verifyPasscodeAction("480913")).toEqual({ status: "error" });
    expect(s.wrote).toEqual([]);
  });

  it("paces per user and per address, before the database is asked", async () => {
    s.paced = "ip";
    expect(await verifyPasscodeAction("480913")).toEqual({ status: "paced", retryAfterSeconds: 120 });
    expect(s.rpc).not.toHaveBeenCalled();
    expect(s.consumed.map((c) => c.subject)).toEqual(["user:user-1", "ip:203.0.113.9"]);
    s.paced = "user";
    expect((await verifyPasscodeAction("480913")).status).toBe("paced");
  });

  it("never sends a malformed code, and refuses a signed-out caller", async () => {
    expect((await verifyPasscodeAction("48a913")).status).toBe("wrong");
    expect((await verifyPasscodeAction("12345")).status).toBe("wrong");
    expect(s.rpc).not.toHaveBeenCalled();
    s.signedIn = false;
    expect(await verifyPasscodeAction("480913")).toEqual({ status: "signed-out" });
  });
});

describe("setPasscodeAction", () => {
  it("sets a first code and unlocks", async () => {
    s.rpc.mockResolvedValue({ data: { ok: true, event: "set" }, error: null });
    expect(await setPasscodeAction({ code: "480913", confirm: "480913", length: 6 })).toEqual({ ok: true, event: "set" });
    expect(s.rpc).toHaveBeenCalledWith("passcode_set", { p_code: "480913", p_length: 6, p_current: null });
    expect(s.wrote).toEqual(["unlock:user-1", "clear-reset-intent"]);
  });

  it("refuses a mismatch, a trivial code and a wrong length before asking the database", async () => {
    expect(await setPasscodeAction({ code: "480913", confirm: "480914", length: 6 })).toEqual({ ok: false, reason: "mismatch" });
    expect(await setPasscodeAction({ code: "123456", confirm: "123456", length: 6 })).toEqual({ ok: false, reason: "trivial" });
    expect(await setPasscodeAction({ code: "1234", confirm: "1234", length: 4 })).toEqual({ ok: false, reason: "trivial" });
    expect(await setPasscodeAction({ code: "7302", confirm: "7302", length: 5 })).toEqual({ ok: false, reason: "length" });
    expect(s.rpc).not.toHaveBeenCalled();
  });

  it("sends the current code on a change, and reports a wrong one with what is left", async () => {
    s.rpc.mockResolvedValue({ data: { ok: false, reason: "current", attempt: { status: "wrong", failed_count: 1 } }, error: null });
    const result = await setPasscodeAction({ code: "580317", confirm: "580317", length: 6, current: "7302" });
    expect(s.rpc).toHaveBeenCalledWith("passcode_set", { p_code: "580317", p_length: 6, p_current: "7302" });
    expect(result).toEqual({ ok: false, reason: "current", attempt: { status: "wrong", beforeCooldown: 4, beforeSignOut: 9 } });
    expect(s.wrote).toEqual([]);
  });

  it("signs out when a wrong current code was the tenth", async () => {
    s.rpc.mockResolvedValue({ data: { ok: false, reason: "current", attempt: { status: "reset_required" } }, error: null });
    expect(await setPasscodeAction({ code: "580317", confirm: "580317", length: 6, current: "7302" })).toEqual({ ok: false, reason: "locked-out" });
    expect(s.signOut).toHaveBeenCalled();
  });

  it("asks for a fresh sign-in when the database wants proof", async () => {
    s.rpc.mockResolvedValue({ data: { ok: false, reason: "proof_required" }, error: null });
    expect(await setPasscodeAction({ code: "580317", confirm: "580317", length: 6 })).toEqual({ ok: false, reason: "proof_required" });
    expect(s.wrote).toEqual([]);
  });

  it("does not unlock on a database error", async () => {
    s.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect(await setPasscodeAction({ code: "580317", confirm: "580317", length: 6 })).toEqual({ ok: false, reason: "error" });
    expect(s.wrote).toEqual([]);
  });
});

describe("lock and forgot", () => {
  it("lock clears the unlock", async () => {
    await lockPasscodeAction();
    expect(s.wrote).toEqual(["clear-unlock"]);
  });

  it("'Use your password instead' remembers the reset, signs out, and goes to sign-in keeping a safe next", async () => {
    await expect(forgotPasscodeAction("/settings/passcode")).rejects.toThrow("NEXT_REDIRECT");
    expect(s.wrote).toEqual(["reset-intent", "clear-unlock"]);
    expect(s.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(s.redirected).toBe("/sign-in?notice=passcode-reset&next=%2Fsettings%2Fpasscode");
  });

  it("drops a next that leaves the site", async () => {
    await expect(forgotPasscodeAction("//evil.example/x")).rejects.toThrow("NEXT_REDIRECT");
    expect(s.redirected).toBe("/sign-in?notice=passcode-reset");
  });
});
