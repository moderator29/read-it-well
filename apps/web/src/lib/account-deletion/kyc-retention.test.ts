import { describe, expect, it } from "vitest";

import { destroyExpiredKyc, destroyExpiredMoneyRecords } from "./kyc-retention";
import type { StorageDoor } from "./storage";

/**
 * The retained AML record ends on time: files first, then the rows, and a
 * failed file sweep leaves the rows for the next run.
 */
function world(opts: { removeFails?: boolean } = {}) {
  const calls: string[] = [];
  const removed: string[] = [];
  const door: StorageDoor = {
    async list(bucket, prefix) {
      calls.push(`list:${bucket}:${prefix}`);
      return prefix === "u1" ? [{ name: "stray.jpg", id: "x" }] : [];
    },
    async remove(bucket, paths) {
      removed.push(...paths.map((path) => `${bucket}:${path}`));
      return opts.removeFails ? null : { failed: [] };
    },
  };
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    calls.push(`rpc:${fn}${args["p_user"] ? `:${String(args["p_user"])}` : ""}`);
    if (fn === "due_kyc_destructions") return { users: [{ user_id: "u1", paths: ["u1/passport.jpg"] }] };
    if (fn === "destroy_expired_kyc") return { destroyed: true };
    return null;
  };
  return { calls, removed, deps: { rpc, storage: door } };
}

describe("destroyExpiredKyc", () => {
  it("empties the person's agent-documents folder, then destroys the rows", async () => {
    const w = world();
    const result = await destroyExpiredKyc(w.deps, 50);
    expect(result).toEqual({ due: 1, destroyed: 1, retried: 0, failures: [] });
    expect(w.removed).toEqual(expect.arrayContaining(["agent-documents:u1/passport.jpg", "agent-documents:u1/stray.jpg"]));
    expect(w.removed.every((path) => path.startsWith("agent-documents:"))).toBe(true);
    expect(w.calls.indexOf("rpc:destroy_expired_kyc:u1")).toBeGreaterThan(w.calls.indexOf("list:agent-documents:u1"));
  });

  it("keeps the rows when the files could not be removed, and says so", async () => {
    const w = world({ removeFails: true });
    const result = await destroyExpiredKyc(w.deps, 50);
    expect(result).toEqual({ due: 1, destroyed: 0, retried: 1, failures: ["u1"] });
    expect(w.calls).not.toContain("rpc:destroy_expired_kyc:u1");
  });
});

describe("destroyExpiredMoneyRecords", () => {
  it("redacts the expired financial records in one call", async () => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const rpc = async (fn: string, args: Record<string, unknown>) => {
      calls.push([fn, args]);
      return { redacted: 3 };
    };
    await expect(destroyExpiredMoneyRecords({ rpc }, 50)).resolves.toEqual({ redacted: 3, failed: false });
    expect(calls).toEqual([["destroy_expired_money_records", { p_limit: 50 }]]);
  });

  it("reports a failed call instead of throwing", async () => {
    const rpc = async () => {
      throw new Error("destroy_expired_money_records: boom");
    };
    await expect(destroyExpiredMoneyRecords({ rpc }, 50)).resolves.toEqual({ redacted: 0, failed: true });
  });
});
