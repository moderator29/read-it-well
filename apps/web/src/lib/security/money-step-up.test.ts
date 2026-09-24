import { beforeEach, describe, expect, it, vi } from "vitest";

/* A fake service-role client over two tables: enrolled keys and step-ups. */
const db = vi.hoisted(() => ({
  credentials: [] as { user_id: string }[],
  credentialsError: null as null | { code: string },
  stepUps: [] as { id: string; user_id: string; digest: string; used_at: string | null; expires_at: string }[],
}));

vi.mock("../wallet/ledger", () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      if (table === "money_credentials") {
        return {
          select: () => ({
            eq: (_c: string, user: string) => ({
              limit: async () =>
                db.credentialsError
                  ? { data: null, error: db.credentialsError }
                  : { data: db.credentials.filter((r) => r.user_id === user), error: null },
            }),
          }),
        };
      }
      /* money_step_ups: update(...).eq(id).eq(user).is(used_at,null).gt(expires_at, now).select() */
      return {
        update: (patch: { used_at: string }) => {
          const where: Record<string, string> = {};
          const chain = {
            eq: (c: string, v: string) => ((where[c] = v), chain),
            is: () => chain,
            gt: (_c: string, now: string) => ((where.now = now), chain),
            select: async () => {
              const hit = db.stepUps.filter(
                (r) =>
                  r.id === where.id &&
                  r.user_id === where.user_id &&
                  r.digest === where.digest &&
                  r.used_at === null &&
                  r.expires_at > where.now!,
              );
              for (const r of hit) r.used_at = patch.used_at;
              return { data: hit.map((r) => ({ id: r.id })), error: null };
            },
          };
          return chain;
        },
      };
    },
  }),
}));
vi.mock("../site", () => ({ authOrigin: async () => "https://www.vallospaces.com" }));

const ADA = "11111111-1111-4111-8111-111111111111";
const THIEF = "22222222-2222-4222-8222-222222222222";
const PROOF = "33333333-3333-4333-8333-333333333333";
const later = () => new Date(Date.now() + 60_000).toISOString();
const SEND = { kind: "send" as const, amountKobo: 500_000, target: "ada@example.com" };

beforeEach(() => {
  db.credentials = [];
  db.credentialsError = null;
  db.stepUps = [];
});

async function digestOf(intent: typeof SEND) {
  const { intentDigest } = await import("./money-step-up");
  return intentDigest(intent);
}

describe("moneyStepUpRefusal (V-81)", () => {
  it("asks nothing new of somebody who never locked money with a phone", async () => {
    const { moneyStepUpRefusal } = await import("./money-step-up");
    expect(await moneyStepUpRefusal(ADA, null, SEND)).toBeNull();
  });
  it("refuses a locked account with no proof, or with somebody else's", async () => {
    db.credentials = [{ user_id: ADA }];
    db.stepUps = [{ id: PROOF, user_id: THIEF, digest: await digestOf(SEND), used_at: null, expires_at: later() }];
    const { moneyStepUpRefusal } = await import("./money-step-up");
    expect(await moneyStepUpRefusal(ADA, null, SEND)).toBe("needed");
    expect(await moneyStepUpRefusal(ADA, PROOF, SEND)).toBe("needed");
  });
  it("lets a fresh proof through once, and never twice", async () => {
    db.credentials = [{ user_id: ADA }];
    db.stepUps = [{ id: PROOF, user_id: ADA, digest: await digestOf(SEND), used_at: null, expires_at: later() }];
    const { moneyStepUpRefusal } = await import("./money-step-up");
    expect(await moneyStepUpRefusal(ADA, PROOF, SEND)).toBeNull();
    expect(await moneyStepUpRefusal(ADA, PROOF, SEND)).toBe("needed");
  });
  it("refuses an expired proof", async () => {
    db.credentials = [{ user_id: ADA }];
    db.stepUps = [{ id: PROOF, user_id: ADA, digest: await digestOf(SEND), used_at: null, expires_at: new Date(Date.now() - 1).toISOString() }];
    const { moneyStepUpRefusal } = await import("./money-step-up");
    expect(await moneyStepUpRefusal(ADA, PROOF, SEND)).toBe("needed");
  });
  it("refuses a proof made for a different amount or recipient", async () => {
    db.credentials = [{ user_id: ADA }];
    db.stepUps = [{ id: PROOF, user_id: ADA, digest: await digestOf(SEND), used_at: null, expires_at: later() }];
    const { moneyStepUpRefusal } = await import("./money-step-up");
    expect(await moneyStepUpRefusal(ADA, PROOF, { ...SEND, amountKobo: 50_000_000 })).toBe("needed");
    expect(await moneyStepUpRefusal(ADA, PROOF, { ...SEND, target: "thief@example.com" })).toBe("needed");
    expect(await moneyStepUpRefusal(ADA, PROOF, { ...SEND, target: "ADA@example.com " })).toBeNull();
  });
  it("fails closed when the lock cannot be read, and open only when it is not deployed", async () => {
    const { moneyStepUpRefusal } = await import("./money-step-up");
    db.credentialsError = { code: "57014" };
    expect(await moneyStepUpRefusal(ADA, null, SEND)).toBe("needed");
    /* What PostgREST answers while the V-81 migration is not applied. */
    db.credentialsError = { code: "PGRST205" };
    expect(await moneyStepUpRefusal(ADA, null, SEND)).toBeNull();
    const { lockNotDeployed } = await import("./money-step-up");
    expect(["PGRST205", "PGRST204", "42P01"].map((code) => lockNotDeployed({ code }))).toEqual([true, true, true]);
    expect(lockNotDeployed({ code: "57014" })).toBe(false);
  });
});
