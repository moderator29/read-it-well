import { describe, expect, it } from "vitest";
import { purgeOne, runAccountPurges, storagePathsFrom, type PurgeDeps } from "./purge";
import type { StorageDoor } from "./storage";

/**
 * The purge, driven branch by branch with its dependencies handed in.
 *
 * What is pinned: a request inside its grace window destroys nothing; a
 * request already purged is a no-op that reports itself as one, which is the
 * idempotence a retried scheduled job depends on; the address is read BEFORE
 * anything is destroyed, because it is about to stop existing; a storage
 * failure leaves the request OPEN so the next run retries it rather than a
 * person believing a deletion happened that did not; an auth scrub that
 * neither route managed does the same; the completion email goes only after
 * the request is closed; and every step writes an audit line carrying numbers
 * and uuids and nothing that names anybody.
 */

const REQUEST = "req-1";
const USER = "user-1";

type Recorded = { action: string; userId: string | null; detail: Record<string, unknown> };

function deps(
  overrides: Partial<PurgeDeps> & { rpcAnswers?: Record<string, unknown> } = {},
): PurgeDeps & { calls: string[]; audits: Recorded[]; emails: string[] } {
  const calls: string[] = [];
  const audits: Recorded[] = [];
  const emails: string[] = [];
  const answers: Record<string, unknown> = {
    purge_account_rows: {
      purged: true,
      user_id: USER,
      auth_scrubbed: true,
      counts: { posts: 3, bookings_kept: 2 },
      storage: {},
    },
    finish_account_purge: { finished: true },
    fail_account_purge: { recorded: true },
    due_account_purges: { requests: [] },
    ...(overrides.rpcAnswers ?? {}),
  };

  const emptyDoor: StorageDoor = {
    async list() {
      return [];
    },
    async remove() {
      return { failed: [] };
    },
  };

  const base: PurgeDeps = {
    rpc: async (fn) => {
      calls.push(fn);
      const answer = answers[fn];
      if (answer instanceof Error) throw answer;
      return answer;
    },
    storage: emptyDoor,
    readContact: async () => {
      calls.push("readContact");
      return { email: "someone@example.test", name: "Ada" };
    },
    scrubAuth: async () => {
      calls.push("scrubAuth");
      return true;
    },
    sendCompleted: async (to) => {
      calls.push("sendCompleted");
      emails.push(to);
    },
    audit: async (action, userId, _requestId, detail) => {
      calls.push(`audit:${action}`);
      audits.push({ action, userId, detail: detail ?? {} });
    },
  };

  const { rpcAnswers: _ignored, ...rest } = overrides;
  return { ...base, ...rest, calls, audits, emails };
}

const due = { requestId: REQUEST, userId: USER, attempts: 0 };

describe("purging one account", () => {
  it("reads the address before anything is destroyed", async () => {
    const d = deps();
    await purgeOne(d, due);
    expect(d.calls.indexOf("readContact")).toBeLessThan(d.calls.indexOf("purge_account_rows"));
  });

  it("purges, closes the request, then sends the last email in that order", async () => {
    const d = deps();
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("purged");
    expect(d.calls.indexOf("finish_account_purge")).toBeLessThan(d.calls.indexOf("sendCompleted"));
    expect(d.emails).toEqual(["someone@example.test"]);
  });

  it("destroys nothing while the grace window is still running", async () => {
    const d = deps({
      rpcAnswers: { purge_account_rows: { purged: false, reason: "not_due" } },
    });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("not_due");
    expect(d.calls).not.toContain("finish_account_purge");
    expect(d.calls).not.toContain("sendCompleted");
    expect(d.audits.map((line) => line.action)).not.toContain("account.deletion.purge_completed");
  });

  it("is a no-op the second time, which is what a retried job depends on", async () => {
    const d = deps({ rpcAnswers: { purge_account_rows: { already: true, status: "PURGED" } } });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("already");
    expect(d.calls).not.toContain("finish_account_purge");
    expect(d.emails).toEqual([]);
  });

  it("leaves the request open when a bucket could not be swept", async () => {
    const d = deps({
      storage: {
        async list() {
          return null;
        },
        async remove() {
          return { failed: [] };
        },
      },
    });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("retry");
    expect(outcome.reason).toBe("storage_incomplete");
    expect(d.calls).toContain("fail_account_purge");
    expect(d.calls).not.toContain("finish_account_purge");
  });

  it("leaves the request open when neither route could scrub the auth row", async () => {
    const d = deps({
      rpcAnswers: {
        purge_account_rows: { purged: true, auth_scrubbed: false, counts: {}, storage: {} },
      },
      scrubAuth: async () => false,
    });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("retry");
    expect(outcome.reason).toBe("auth_not_scrubbed");
    expect(d.calls).not.toContain("finish_account_purge");
  });

  it("completes when one of the two auth routes worked", async () => {
    const d = deps({
      rpcAnswers: {
        purge_account_rows: { purged: true, auth_scrubbed: false, counts: {}, storage: {} },
      },
    });
    expect((await purgeOne(d, due)).result).toBe("purged");
  });

  it("retries rather than closing when the database call itself fails", async () => {
    const d = deps({ rpcAnswers: { purge_account_rows: new Error("connection reset") } });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("retry");
    expect(d.calls).toContain("fail_account_purge");
  });

  it("still deletes the account when the last email cannot be sent", async () => {
    const d = deps({
      sendCompleted: async () => {
        throw new Error("resend down");
      },
    });
    expect((await purgeOne(d, due)).result).toBe("purged");
  });

  it("still deletes the account when the address cannot be read", async () => {
    const d = deps({
      readContact: async () => {
        throw new Error("gone");
      },
    });
    const outcome = await purgeOne(d, due);
    expect(outcome.result).toBe("purged");
    expect(d.emails).toEqual([]);
  });

  it("writes only numbers, booleans and uuids into the audit lines", async () => {
    const d = deps();
    await purgeOne(d, due);
    const completed = d.audits.find((line) => line.action === "account.deletion.purge_completed");
    expect(completed).toBeDefined();
    expect(completed?.userId).toBe(USER);
    for (const value of Object.values(completed?.detail ?? {})) {
      expect(["number", "boolean"]).toContain(typeof value);
    }
    const serialised = JSON.stringify(d.audits);
    expect(serialised).not.toContain("someone@example.test");
    expect(serialised).not.toContain("Ada");
  });
});

describe("one scheduled run", () => {
  it("takes what is due and reports what did not finish", async () => {
    const d = deps({
      rpcAnswers: {
        due_account_purges: {
          requests: [
            { request_id: "r1", user_id: "u1", attempts: 0 },
            { request_id: "r2", user_id: "u2", attempts: 2 },
            { request_id: null, user_id: "u3" },
          ],
        },
        purge_account_rows: { purged: true, auth_scrubbed: true, counts: {}, storage: {} },
      },
    });
    const result = await runAccountPurges(d, 10);
    expect(result.due).toBe(2);
    expect(result.purged).toBe(2);
    expect(result.retried).toBe(0);
    expect(result.failures).toEqual([]);
  });

  it("carries the request ids of the ones that failed, and nothing that names a person", async () => {
    const d = deps({
      rpcAnswers: {
        due_account_purges: { requests: [{ request_id: "r1", user_id: "u1", attempts: 0 }] },
        purge_account_rows: { purged: false, reason: "locked" },
      },
    });
    const result = await runAccountPurges(d, 10);
    expect(result.retried).toBe(1);
    expect(result.failures).toEqual(["r1"]);
  });

  it("does nothing at all when nothing is due", async () => {
    const d = deps();
    const result = await runAccountPurges(d, 10);
    expect(result).toEqual({ due: 0, purged: 0, retried: 0, failures: [] });
    expect(d.calls).toEqual(["due_account_purges"]);
  });
});

describe("reading the storage paths the database saw", () => {
  it("keeps strings and drops everything else", () => {
    expect(
      storagePathsFrom({
        avatars: ["a/b.jpg", "", 7, null],
        "message-attachments": "not an array",
        _read_failed: true,
      }),
    ).toEqual({ avatars: ["a/b.jpg"] });
  });

  it("reads a missing document as no paths rather than throwing", () => {
    expect(storagePathsFrom(undefined)).toEqual({});
    expect(storagePathsFrom("no")).toEqual({});
  });
});
