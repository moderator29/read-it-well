import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CHECKING_WINDOW_MS,
  accountCardState,
  holderMatches,
  runAccountCheck,
  type AccountCheckDeps,
  type AccountCheckOutcome,
  type AccountCheckRow,
  type ResolveAnswer,
} from "./account-check";

/**
 * V-04 proven with a STUB RESOLVER. The processor's secret key is not present
 * outside production, so every card state is driven here from fixtures: the
 * resolver is a function of (number, bank) to an answer, and the test reads
 * back exactly what would have been written.
 */

const LISTER = "11111111-1111-4111-8111-111111111111";
const RENTER = "22222222-2222-4222-8222-222222222222";
const MESSAGE = "33333333-3333-4333-8333-333333333333";
const CONVERSATION = "44444444-4444-4444-8444-444444444444";

function deps(over: Partial<AccountCheckDeps> & { holder?: string | null } = {}) {
  const saved: AccountCheckRow[] = [];
  const resolve = vi.fn(async (): Promise<ResolveAnswer> =>
    over.holder === null || over.holder === undefined
      ? { ok: false, failure: "not-confirmed" }
      : { ok: true, accountName: over.holder },
  );
  const built: AccountCheckDeps = {
    resolve,
    banks: async () => [
      { code: "058", name: "Guaranty Trust Bank" },
      { code: "057", name: "Zenith Bank" },
    ],
    verifiedNames: async () => [{ kind: "person", name: "Chidi Okeke" }],
    consume: async () => true,
    save: async (row) => {
      saved.push(row);
    },
    ...over,
  };
  return { deps: built, saved, resolve };
}

const input = (body: string, senderId = LISTER) => ({
  messageId: MESSAGE,
  conversationId: CONVERSATION,
  senderId,
  listerUserId: LISTER,
  body,
});

describe("runAccountCheck", () => {
  it("writes a match when the holder is the verified lister, and keeps four digits only", async () => {
    const { deps: d, saved } = deps({ holder: "OKEKE CHIDI EMMANUEL" });
    const row = await runAccountCheck(d, input("Pay into GTB 0123456785"));
    expect(row).toEqual({
      message_id: MESSAGE,
      conversation_id: CONVERSATION,
      bank_code: "058",
      last4: "6785",
      name_matches_lister: true,
      shares_a_name: null,
      outcome: "match",
    });
    expect(JSON.stringify(saved)).not.toContain("0123456785");
    expect(JSON.stringify(saved)).not.toMatch(/OKEKE|CHIDI/);
  });

  it("writes a total no-match when the holder shares no name with the lister", async () => {
    const { deps: d, saved } = deps({ holder: "ADEBAYO TUNDE" });
    await runAccountCheck(d, input("GTB 0123456785 pay the caution"));
    expect(saved[0]).toMatchObject({ outcome: "no_match", name_matches_lister: false, shares_a_name: false, bank_code: "058" });
  });

  it("marks a no-match that shares a name, so it is not drawn as an accusation", async () => {
    const { deps: d, saved } = deps({ holder: "OKEKE NGOZI" });
    await runAccountCheck(d, input("GTB 0123456785"));
    expect(saved[0]).toMatchObject({ outcome: "no_match", shares_a_name: true });
  });

  it("checks nothing when a message holds two numbers: the card speaks for the whole message", async () => {
    const { deps: d, saved, resolve } = deps({ holder: "OKEKE CHIDI" });
    expect(await runAccountCheck(d, input("GTB 0123456785 or Zenith 0123456788"))).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    expect(saved).toEqual([]);
  });

  it("writes unresolved when the bank does not know the number", async () => {
    const { deps: d, saved } = deps({ holder: null });
    await runAccountCheck(d, input("GTB 0123456785"));
    expect(saved[0]).toMatchObject({ outcome: "unresolved", name_matches_lister: null, bank_code: null });
  });

  it("writes unresolved, and asks nobody, when the bank cannot be narrowed", async () => {
    const { deps: d, saved, resolve } = deps({
      holder: "OKEKE CHIDI",
      banks: async () => [
        { code: "044", name: "Access Bank" },
        { code: "011", name: "First Bank of Nigeria" },
        { code: "033", name: "United Bank For Africa" },
      ],
    });
    await runAccountCheck(d, input("0123456784"));
    expect(resolve).not.toHaveBeenCalled();
    expect(saved[0]).toMatchObject({ outcome: "unresolved" });
  });

  it("writes no_verified_name, and asks no bank, when nobody checked the lister", async () => {
    const { deps: d, saved, resolve } = deps({ holder: "OKEKE CHIDI", verifiedNames: async () => [] });
    await runAccountCheck(d, input("GTB 0123456785"));
    expect(resolve).not.toHaveBeenCalled();
    expect(saved[0]).toMatchObject({ outcome: "no_verified_name", name_matches_lister: null });
  });

  it("writes limited, and reads no name, when the allowance is spent", async () => {
    const verifiedNames = vi.fn(async () => [{ kind: "person" as const, name: "Chidi Okeke" }]);
    const { deps: d, saved, resolve } = deps({ holder: "OKEKE CHIDI", consume: async () => false, verifiedNames });
    await runAccountCheck(d, input("GTB 0123456785"));
    expect(verifiedNames).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
    expect(saved[0]).toMatchObject({ outcome: "limited" });
  });

  it("does nothing when the renter sent the number: there is nobody to compare with", async () => {
    const { deps: d, saved, resolve } = deps({ holder: "OKEKE CHIDI" });
    expect(await runAccountCheck(d, input("my refund account GTB 0123456785", RENTER))).toBeNull();
    expect(resolve).not.toHaveBeenCalled();
    expect(saved).toEqual([]);
  });

  it("does nothing when there is no account number", async () => {
    const { deps: d, saved } = deps({ holder: "OKEKE CHIDI" });
    expect(await runAccountCheck(d, input("See you on Saturday"))).toBeNull();
    expect(saved).toEqual([]);
  });

  it("writes unresolved when the bank registry cannot be read", async () => {
    const { deps: d, saved } = deps({
      holder: "OKEKE CHIDI",
      banks: async () => {
        throw new Error("down");
      },
    });
    await runAccountCheck(d, input("GTB 0123456785"));
    expect(saved[0]).toMatchObject({ outcome: "unresolved" });
  });

  it("matches a firm's account against its registered name", () => {
    expect(holderMatches("ACME PROPERTIES NIG LTD", [{ kind: "business", name: "Acme Properties Limited" }])).toBe(true);
    expect(holderMatches("ACME LTD", [{ kind: "business", name: "Acme Properties Limited" }])).toBe(false);
  });
});

describe("the receiver's card, from the stored outcome", () => {
  const now = Date.parse("2026-09-24T10:00:00Z");
  const fresh = new Date(now - 5_000).toISOString();
  const old = new Date(now - CHECKING_WINDOW_MS - 1).toISOString();
  const view = (outcome: AccountCheckOutcome, sharesAName: boolean | null = null) => ({ outcome, sharesAName });

  it("prints ownership only for match and no_match, and the error weight only for a total mismatch", () => {
    expect(accountCardState(view("match"), old, now)).toBe("belongs");
    expect(accountCardState(view("no_match", true), old, now)).toBe("not_on_record");
    expect(accountCardState(view("no_match", false), old, now)).toBe("not_on_record_total");
    for (const outcome of ["unresolved", "no_verified_name", "limited"] as const) {
      expect(accountCardState(view(outcome), fresh, now)).toBe("silent");
    }
  });

  it("says it is checking for the first minute, and nothing after", () => {
    expect(accountCardState(null, fresh, now)).toBe("checking");
    expect(accountCardState(null, old, now)).toBe("silent");
    expect(accountCardState(null, null, now)).toBe("silent");
  });

  it("says nothing about ownership when a message holds more than one number", () => {
    expect(accountCardState(null, fresh, now, 2)).toBe("silent");
    expect(accountCardState(view("match"), old, now, 2)).toBe("silent");
  });
});

describe("the wiring", () => {
  const root = join(__dirname, "..", "..");
  it("sendMessage schedules the check after the insert and never awaits it", () => {
    const src = readFileSync(join(root, "lib/messages/actions.ts"), "utf8");
    const send = src.slice(src.indexOf("export async function sendMessage"));
    const body = send.slice(0, send.indexOf("\n}\n"));
    expect(body).toMatch(/after\(\(\) => checkAccountAfterSend\(sent\)\)/);
    expect(body.indexOf("after(")).toBeGreaterThan(body.indexOf(".insert("));
    expect(body).not.toMatch(/await checkAccountAfterSend/);
  });

  it("the production allowance fails closed when the limiter is degraded", () => {
    const src = readFileSync(join(root, "lib/messages/account-check-run.ts"), "utf8");
    expect(src).toContain("verdict.allowed && !verdict.degraded");
  });

  it("the card never receives or renders a resolved name", () => {
    const card = readFileSync(join(root, "components/app/messages/AccountMomentCard.tsx"), "utf8");
    expect(card).not.toMatch(/accountName|resolved_account_name|holderName/);
  });

  it("the card is mounted only for the renter, on a listing thread", () => {
    const view = readFileSync(join(root, "app/(app)/messages/[id]/ThreadView.tsx"), "utf8");
    expect(view).toContain('role === "guest" && context?.kind === "listing"');
  });
});
