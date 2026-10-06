import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { withoutComments } from "@/lib/copy/source-scan";
import {
  campaignReached,
  canWithdraw,
  checkWithdrawAmount,
  countByStatus,
  entryDirection,
  nairaToKobo,
  newestFirst,
  pausedProgramme,
  quoteAddsUp,
  withdrawGate,
  type RewardsEntry,
  type RewardsSnapshot,
  type WithdrawQuote,
} from "./rewards";

const POLICY = { rewardPerReferralMinor: 7_000, monthlyCap: 1_500, withdrawMinimumMinor: 100_000 };
const DEST = { bankName: "Bank", accountLast4: "0001", accountName: "A" };

function snapshot(over: Partial<RewardsSnapshot> = {}): RewardsSnapshot {
  return {
    policy: POLICY,
    programme: { state: "running" },
    balance: { availableMinor: 150_000, pendingMinor: 0, lifetimeMinor: 150_000 },
    referrals: [],
    history: [],
    campaign: null,
    destination: DEST,
    ...over,
  };
}

describe("the withdrawal minimum is checked before the provider is asked", () => {
  it("refuses nothing typed, below the minimum, and above what is available", () => {
    expect(checkWithdrawAmount(null, 150_000, 100_000)).toBe("empty");
    expect(checkWithdrawAmount(0, 150_000, 100_000)).toBe("empty");
    expect(checkWithdrawAmount(99_999, 150_000, 100_000)).toBe("below-minimum");
    expect(checkWithdrawAmount(150_001, 150_000, 100_000)).toBe("above-available");
    expect(checkWithdrawAmount(100_000, 150_000, 100_000)).toBe("ok");
    expect(checkWithdrawAmount(150_000, 150_000, 100_000)).toBe("ok");
  });

  it("refuses a fraction of a kobo or a negative figure", () => {
    expect(checkWithdrawAmount(100_000.5, 150_000, 100_000)).toBe("empty");
    expect(checkWithdrawAmount(-100_000, 150_000, 100_000)).toBe("empty");
  });

  it("offers a withdrawal only once available reaches the minimum from policy", () => {
    expect(canWithdraw({ availableMinor: 99_999, pendingMinor: 500_000, lifetimeMinor: 0 }, POLICY)).toBe(false);
    expect(canWithdraw({ availableMinor: 100_000, pendingMinor: 0, lifetimeMinor: 0 }, POLICY)).toBe(true);
  });

  it("reads typed naira as whole kobo", () => {
    expect(nairaToKobo("1000")).toBe(100_000);
    expect(nairaToKobo("1000.5")).toBe(100_050);
    expect(nairaToKobo("1000.05")).toBe(100_005);
    expect(nairaToKobo("")).toBeNull();
    expect(nairaToKobo("1,000")).toBeNull();
  });
});

describe("a quote is drawn only when its own figures add up", () => {
  const quote = (over: Partial<WithdrawQuote> = {}): WithdrawQuote => ({
    quoteId: "q",
    amountMinor: 100_000_000,
    feeMinor: 30_000,
    receiveMinor: 99_970_000,
    destination: DEST,
    ...over,
  });

  it("accepts the pricing document's own worked example", () => {
    /* VALLO_PRICING 3: Amount 1,000,000, Processing fee 300, You'll receive 999,700. */
    expect(quoteAddsUp(quote(), 100_000_000)).toBe(true);
  });

  it("refuses a total that does not add up, a quote for another amount, and a fee in fractions", () => {
    expect(quoteAddsUp(quote({ receiveMinor: 99_980_000 }), 100_000_000)).toBe(false);
    expect(quoteAddsUp(quote(), 50_000_000)).toBe(false);
    expect(quoteAddsUp(quote({ feeMinor: 30_000.5, receiveMinor: 99_969_999.5 }), 100_000_000)).toBe(false);
    expect(quoteAddsUp(quote({ feeMinor: 100_000_000, receiveMinor: 0 }), 100_000_000)).toBe(false);
  });
});

describe("the withdraw screen's gate says the most useful truth first", () => {
  it("names a rail that is not open before anything else", () => {
    expect(withdrawGate(snapshot({ destination: null }), false)).toBe("not-open");
  });
  it("then the minimum, then the bank account, then opens", () => {
    expect(withdrawGate(snapshot({ balance: { availableMinor: 1, pendingMinor: 0, lifetimeMinor: 1 } }), true)).toBe("below-minimum");
    expect(withdrawGate(snapshot({ destination: null }), true)).toBe("no-destination");
    expect(withdrawGate(snapshot(), true)).toBe("open");
  });
});

describe("the referral list and the history", () => {
  it("counts every status, zero when none", () => {
    expect(
      countByStatus([
        { id: "a", firstName: null, status: "qualified", joinedOn: "2026-10-01", qualifiedOn: "2026-10-02" },
        { id: "b", firstName: null, status: "under_review", joinedOn: "2026-10-01", qualifiedOn: null },
      ]),
    ).toEqual({ joined: 0, pending: 0, under_review: 1, qualified: 1 });
  });

  it("takes away only for a withdrawal or a reversal", () => {
    expect(entryDirection("referral")).toBe("in");
    expect(entryDirection("bonus")).toBe("in");
    expect(entryDirection("withdrawal")).toBe("out");
    expect(entryDirection("reversal")).toBe("out");
  });

  it("lists newest first and keeps the order of entries at the same moment", () => {
    const e = (id: string, at: string): RewardsEntry => ({ id, kind: "referral", amountMinor: 1, at, state: "done", firstName: null, withdrawal: null });
    expect(newestFirst([e("a", "2026-09-01T00:00:00Z"), e("b", "2026-10-01T00:00:00Z"), e("c", "2026-10-01T00:00:00Z")]).map((x) => x.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("clamps a campaign's progress to its target", () => {
    expect(campaignReached({ id: "c", name: "n", target: 20, reached: 25, bonusMinor: 1, endsOn: null })).toBe(20);
    expect(campaignReached({ id: "c", name: "n", target: 20, reached: -1, bonusMinor: 1, endsOn: null })).toBe(0);
  });
});

describe("what the rewards screens may never say or carry (D51)", () => {
  const copy = getDictionary("en").experienceRewards;
  const text = JSON.stringify(copy).toLowerCase();

  it("never calls the balance a wallet, and never reads like a scheme", () => {
    for (const word of ["wallet", "downline", "upline", "level", "tree", "passive", "invest", "returns", "so i can earn", "earn money"]) {
      expect(text, word).not.toContain(word);
    }
    expect(copy.balance.label).toBe("Rewards Balance");
  });

  it("sells the product in the share message, never the bounty", () => {
    expect(copy.invite.shareText.startsWith("Join me on Vallo")).toBe(true);
    expect(copy.invite.shareText).toContain("{url}");
    expect(copy.invite.shareText.toLowerCase()).not.toMatch(/earn|reward|naira|₦|bonus|paid/);
  });

  it("gives a referral no field for a reason, a risk signal or a second level", () => {
    const model = withoutComments(readFileSync(join(__dirname, "rewards.ts"), "utf8"));
    const row = /export type ReferralRow = \{([\s\S]*?)\n\};/.exec(model)?.[1] ?? "";
    expect(row).toContain("status: ReferralStatus");
    expect(row).not.toMatch(/reason|risk|fraud|score|signal|invitedBy|children|level/i);
  });

  it("writes no rate, cap or minimum into a referral component or route", () => {
    const dirs = [join(__dirname, "..", "..", "components", "app", "referral"), join(__dirname, "..", "..", "app", "(app)", "rewards")];
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) walk(join(dir, entry.name));
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) files.push(join(dir, entry.name));
      }
    };
    dirs.forEach(walk);
    expect(files.length).toBeGreaterThan(8);
    for (const file of files) {
      const source = withoutComments(readFileSync(file, "utf8"));
      expect(source, file).not.toMatch(/\b(7_?000|70|1_?500|100_?000|1,000|1,500)\b/);
      expect(source, file).not.toMatch(/wallet/i);
    }
  });
});

describe("D64: the programme pauses at the platform budget, and the screens can tell", () => {
  it("reads a paused programme only from a ready snapshot, and never draws a malformed day", () => {
    expect(pausedProgramme({ state: "not-live" })).toBeNull();
    expect(pausedProgramme({ state: "failed" })).toBeNull();
    expect(pausedProgramme({ state: "ready", snapshot: snapshot() })).toBeNull();
    expect(pausedProgramme({ state: "ready", snapshot: snapshot({ programme: { state: "paused", resumesOn: null } }) })).toEqual({
      state: "paused",
      resumesOn: null,
    });
    expect(
      pausedProgramme({ state: "ready", snapshot: snapshot({ programme: { state: "paused", resumesOn: "2026-11-01" } }) })?.resumesOn,
    ).toBe("2026-11-01");
    expect(
      pausedProgramme({ state: "ready", snapshot: snapshot({ programme: { state: "paused", resumesOn: "start of next month" } }) })?.resumesOn,
    ).toBeNull();
  });

  it("says the pause in plain words, with no date, no wallet and no reward offered", () => {
    const pause = getDictionary("en").experienceRewards.pause;
    const text = Object.values(pause).join(" ");
    expect(pause.title).toBe("Rewards are paused this month");
    expect(text).not.toMatch(/wallet|refus|\b\d{1,2}(st|nd|rd|th)?\b|november|december|earn up to/i);
    expect(pause.resumes).toContain("{date}");
  });
});
