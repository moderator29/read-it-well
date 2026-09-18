import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The money table, applied. The limiter itself is proven in
 * rate-limit.test.ts; this proves each money action reaches its own bucket
 * with its own numbers and that a refusal is a complete sentence with a time
 * in it, because that sentence is what a person sees.
 */

const seen: { bucket: string; subject: string; limit: number; windowSeconds: number }[] = [];
let deny = false;

vi.mock("./rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./rate-limit")>();
  return {
    ...actual,
    consume: async (request: (typeof seen)[number]) => {
      seen.push(request);
      if (deny) return { allowed: false, retryAfterSeconds: 240, retryIn: "in about 4 minutes" };
      return { allowed: true, degraded: false };
    },
  };
});

import {
  MONEY_LIMITS,
  ROUTE_FAILURE_LIMITS,
  countRouteFailure,
  guardMoney,
  type MoneyAction,
} from "./money-limits";

/* Rule 1, checked as a codepoint so this file carries no dash itself. */
const EM_DASH = String.fromCharCode(0x2014);

describe("MONEY_LIMITS", () => {
  it("names every money path with a distinct bucket and sane numbers", () => {
    const buckets = new Set<string>();
    for (const [action, rule] of Object.entries(MONEY_LIMITS)) {
      expect(rule.bucket, action).toMatch(/^[a-z_]+$/);
      expect(buckets.has(rule.bucket), `${action} shares ${rule.bucket}`).toBe(false);
      buckets.add(rule.bucket);
      expect(rule.limit).toBeGreaterThanOrEqual(1);
      expect(rule.limit).toBeLessThanOrEqual(60);
      expect(rule.windowSeconds).toBeGreaterThanOrEqual(60);
      expect(rule.windowSeconds).toBeLessThanOrEqual(24 * 60 * 60);
      expect(rule.refusal.length).toBeGreaterThan(20);
      /* Rule 1: no em dash anywhere, including copy a person reads. */
      expect(rule.refusal).not.toContain(EM_DASH);
    }
  });

  it("keeps the two pre-existing buckets so applied counters carry over", () => {
    expect(MONEY_LIMITS.chargeSavedCard.bucket).toBe("card_charge");
    expect(MONEY_LIMITS.startCardSetup.bucket).toBe("card_setup");
  });
});

describe("guardMoney", () => {
  beforeEach(() => {
    seen.length = 0;
    deny = false;
  });

  it("consumes the action's own bucket for the user", async () => {
    const verdict = await guardMoney("withdraw", "user-1");
    expect(verdict).toEqual({ allowed: true, degraded: false });
    expect(seen).toEqual([
      {
        bucket: "money_withdraw",
        subject: "user:user-1",
        limit: MONEY_LIMITS.withdraw.limit,
        windowSeconds: MONEY_LIMITS.withdraw.windowSeconds,
      },
    ]);
  });

  it("refuses with the action's sentence and a time to come back", async () => {
    deny = true;
    const verdict = await guardMoney("transferToUser", "user-1");
    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) throw new Error("unreachable");
    expect(verdict.message).toBe(
      `${MONEY_LIMITS.transferToUser.refusal} Try again in about 4 minutes.`,
    );
    expect(verdict.retryAfterSeconds).toBe(240);
  });

  it("reaches a bucket for every action in the table", async () => {
    for (const action of Object.keys(MONEY_LIMITS) as MoneyAction[]) {
      await guardMoney(action, "u");
    }
    expect(seen.map((s) => s.bucket)).toEqual(
      Object.values(MONEY_LIMITS).map((rule) => rule.bucket),
    );
  });
});

describe("countRouteFailure", () => {
  beforeEach(() => {
    seen.length = 0;
    deny = false;
  });

  it("counts against the forwarded address, and falls back to a shared subject", async () => {
    await countRouteFailure(
      ROUTE_FAILURE_LIMITS.webhookBadSignature,
      new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }),
    );
    await countRouteFailure(ROUTE_FAILURE_LIMITS.cronBadSecret, new Headers());
    expect(seen[0]?.subject).toBe("ip:203.0.113.5");
    expect(seen[0]?.bucket).toBe("webhook_bad_signature");
    expect(seen[1]?.subject).toBe("ip:local");
    expect(seen[1]?.bucket).toBe("cron_bad_secret");
  });

  it("says no once the address is spent", async () => {
    deny = true;
    expect(
      await countRouteFailure(ROUTE_FAILURE_LIMITS.webhookBadSignature, new Headers()),
    ).toEqual({ allowed: false, retryAfterSeconds: 240 });
  });
});
