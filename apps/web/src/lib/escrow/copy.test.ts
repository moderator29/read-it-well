import { describe, expect, it } from "vitest";

import {
  BANNED_IN_ESCROW_COPY,
  CUSTODY_STRUCTURE,
  OPEN_PURPOSES,
  PURPOSE_REFUSAL,
  SET_ASIDE_SENTENCE,
  STATE_LABEL,
  bannedWordsIn,
  countdown,
  countdownForPayer,
  custodySentence,
  isLive,
  isSettled,
  settlementLines,
  stateLine,
  type EscrowState,
  type Party,
} from "./copy";
import {
  heldPaymentDisputed,
  heldPaymentPaidOut,
  heldPaymentPayoutAsked,
  heldPaymentProposed,
  heldPaymentReturned,
  heldPaymentRuling,
  heldPaymentSetAside,
  heldPaymentWithdrawn,
} from "../email/escrow-messages";

const STATES: readonly EscrowState[] = [
  "INITIATED",
  "FUNDED",
  "HELD",
  "RELEASE_REQUESTED",
  "RELEASED",
  "REFUNDED",
  "DISPUTED",
  "RESOLVED",
  "CANCELLED",
];
const PARTIES: readonly Party[] = ["payer", "payee"];

const base = {
  name: "Ada",
  id: "11111111-2222-4333-8444-555555555555",
  amountMinor: 250_000,
  purpose: "agency_fee" as const,
  counterpartyName: "Bolu",
  listingTitle: "2 bedroom flat, Yaba",
};

/** The plain text rendering with its hard wrapping undone, for prose checks. */
function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const EVERY_EMAIL = [
  heldPaymentProposed({ ...base, viewer: "payer" }),
  heldPaymentProposed({ ...base, viewer: "payee", note: "For the inspection on Saturday." }),
  heldPaymentSetAside({ ...base, viewer: "payer", autoReleaseAt: "2026-10-14T09:00:00Z" }),
  heldPaymentSetAside({ ...base, viewer: "payee", autoReleaseAt: "2026-10-14T09:00:00Z" }),
  heldPaymentPayoutAsked({ ...base, viewer: "payer", autoReleaseAt: "2026-10-14T09:00:00Z" }),
  heldPaymentPayoutAsked({ ...base, viewer: "payee", autoReleaseAt: null }),
  heldPaymentPaidOut({ ...base, viewer: "payer", commissionMinor: 0, netMinor: 250_000 }),
  heldPaymentPaidOut({
    ...base,
    viewer: "payee",
    commissionMinor: 12_500,
    netMinor: 237_500,
    automatic: true,
  }),
  heldPaymentReturned({ ...base, viewer: "payer", reason: "The inspection never happened." }),
  heldPaymentReturned({ ...base, viewer: "payee" }),
  heldPaymentDisputed({
    ...base,
    viewer: "payer",
    raisedByYou: true,
    reason: "Nobody turned up for the inspection.",
  }),
  heldPaymentDisputed({
    ...base,
    viewer: "payee",
    raisedByYou: false,
    reason: "Nobody turned up for the inspection.",
  }),
  heldPaymentRuling({
    ...base,
    viewer: "payer",
    direction: "refund",
    ruling: "Neither side produced a record of an inspection, so the money goes back.",
    netMinor: 250_000,
    commissionMinor: 0,
  }),
  heldPaymentWithdrawn({
    ...base,
    viewer: "payee",
    withdrawnByYou: false,
    note: "Withdrawn by the person who proposed it, before any money moved.",
  }),
];

describe("the held payment copy", () => {
  it("never says who is holding the money, because nobody may say yet", () => {
    /* The mechanism, not the care. `custodySentence` returns null while the
       structure is undecided, so a surface has nothing to print. */
    expect(CUSTODY_STRUCTURE).toBe("undecided");
    expect(custodySentence()).toBeNull();
    expect(custodySentence("undecided")).toBeNull();
    /* And the two real structures each have their own honest sentence, ready
       for the day the solicitor answers. */
    expect(custodySentence("trustee")).toContain("independent trustee");
    expect(custodySentence("licensed_partner")).toContain("licensed payments partner");
  });

  it("describes the effect instead, in a sentence true under every structure", () => {
    expect(SET_ASIDE_SENTENCE).toContain("set aside");
    expect(SET_ASIDE_SENTENCE).not.toMatch(/vallo|we hold|held by/i);
  });

  it("says something to BOTH parties in every one of the nine states", () => {
    for (const state of STATES) {
      for (const party of PARTIES) {
        const line = stateLine(state, party);
        expect(line.length).toBeGreaterThan(20);
        expect(line.endsWith(".")).toBe(true);
      }
      expect(STATE_LABEL[state].length).toBeGreaterThan(0);
    }
    /* And the two sides are told different things wherever it matters. */
    for (const state of ["INITIATED", "HELD", "RELEASED", "REFUNDED"] as const) {
      expect(stateLine(state, "payer")).not.toBe(stateLine(state, "payee"));
    }
  });

  it("names what a settled dispute did, not who decided it (ESC-13)", () => {
    expect(STATE_LABEL.RESOLVED).not.toMatch(/vallo/i);
    for (const party of PARTIES) {
      expect(stateLine("RESOLVED", party)).not.toMatch(/vallo has made a decision/i);
      expect(stateLine("RESOLVED", party)).toMatch(/money has moved/i);
    }
  });

  it("renders the countdown as a date and never as a duration", () => {
    const now = new Date("2026-09-22T12:00:00Z");
    const c = countdown("2026-10-14T09:00:00Z", "HELD", now);
    expect(c.kind).toBe("due");
    if (c.kind !== "due") throw new Error("unreachable");
    expect(c.line).toContain("14 Oct 2026");
    /* No number of days, hours or weeks anywhere in it. */
    expect(c.line).not.toMatch(/\b\d+\s*(day|days|hour|hours|week|weeks)\b/i);
    expect(countdownForPayer(c)).toContain("14 Oct 2026");
  });

  it("does not call a passed payout date overdue, because the sweeper is hourly", () => {
    const c = countdown("2026-09-01T09:00:00Z", "HELD", new Date("2026-09-22T12:00:00Z"));
    expect(c.kind).toBe("passed");
    if (c.kind !== "passed") throw new Error("unreachable");
    expect(c.line).toMatch(/on its way/);
    expect(c.line).not.toMatch(/late|overdue|failed/i);
  });

  it("shows no countdown where there is nothing to count to", () => {
    expect(countdown(null, "HELD").kind).toBe("none");
    expect(countdown("2026-10-14T09:00:00Z", "RELEASED").kind).toBe("none");
    expect(countdown("2026-10-14T09:00:00Z", "CANCELLED").kind).toBe("none");
    expect(countdown("not a date", "HELD").kind).toBe("none");
  });

  it("opens the agency fee and nothing else, and refuses the rest in words", () => {
    expect(OPEN_PURPOSES).toEqual(["agency_fee"]);
    expect(PURPOSE_REFUSAL.purchase_balance).toMatch(/solicitor/);
    expect(PURPOSE_REFUSAL.rent_deposit).not.toMatch(/escrow/i);
    for (const sentence of Object.values(PURPOSE_REFUSAL)) {
      expect(bannedWordsIn(sentence)).toEqual([]);
    }
  });

  it("accounts for every kobo on a settlement, and hides no cut", () => {
    const withCut = settlementLines({
      grossMinor: 250_000,
      commissionMinor: 12_500,
      netMinor: 237_500,
    });
    expect(withCut).toHaveLength(3);
    expect(withCut[1]?.label).toBe("Vallo's share");

    /* At today's rates the cut is zero and the line is simply absent, because
       a row saying "we took nothing" on every receipt is noise. */
    const withoutCut = settlementLines({
      grossMinor: 250_000,
      commissionMinor: 0,
      netMinor: 250_000,
    });
    expect(withoutCut).toHaveLength(2);
    expect(withoutCut.map((r) => r.label)).not.toContain("Vallo's share");
  });

  it("knows which states can still be acted on", () => {
    expect(isLive("HELD")).toBe(true);
    expect(isLive("RELEASE_REQUESTED")).toBe(true);
    expect(isLive("DISPUTED")).toBe(true);
    for (const settled of ["RELEASED", "REFUNDED", "RESOLVED", "CANCELLED"] as const) {
      expect(isLive(settled)).toBe(false);
      expect(isSettled(settled)).toBe(true);
    }
    expect(isSettled("HELD")).toBe(false);
  });
});

describe("the held payment emails", () => {
  it("builds one for every state change, with a subject, HTML and text", () => {
    expect(EVERY_EMAIL).toHaveLength(14);
    for (const email of EVERY_EMAIL) {
      expect(email.subject.length).toBeGreaterThan(8);
      expect(email.html).toContain("<html");
      expect(email.text.length).toBeGreaterThan(40);
    }
  });

  it("contains no banned word anywhere in the prose or the subject", () => {
    /*
     * URLS ARE NOT COPY, AND THIS DISTINCTION IS NOT A DODGE.
     *
     * The surface lives at /escrow/<id>, which the brief fixes, and the plain
     * text rendering prints its link in full. A path segment is not a sentence
     * somebody reads to decide what is happening to their money, and the rule
     * is about the sentences. Every URL is stripped and then EVERYTHING ELSE
     * is checked, so a banned word in prose still fails, including one sitting
     * next to a link.
     */
    const withoutUrls = (text: string): string => text.replace(/https?:\/\/\S+/g, " ");
    for (const email of EVERY_EMAIL) {
      for (const field of [email.subject, withoutUrls(email.text)]) {
        expect({ field, banned: bannedWordsIn(field) }).toEqual({ field, banned: [] });
      }
    }
    /* And the stripping does not hide a word that is genuinely in the prose. */
    expect(bannedWordsIn(withoutUrls("Held in escrow. https://x/escrow/1"))).toEqual(["escrow"]);
    /* The list is not empty, so the assertion above is doing work, and it
       carries the house ban as well as escrow's own. */
    expect(BANNED_IN_ESCROW_COPY.length).toBeGreaterThan(8);
    expect(bannedWordsIn("Held in escrow by Vallo")).toContain("escrow");
    expect(bannedWordsIn("Your money is guaranteed and fully insured")).toEqual([
      "guarantee",
      "insured",
    ]);
    /* A word inside another word is not a match, which a substring list got
       wrong: "escrowing" is, "screwdriver" is not. */
    expect(bannedWordsIn("a protective screwdriver")).toEqual([]);
  });

  it("names no holder of the money in any email", () => {
    for (const email of EVERY_EMAIL) {
      expect(flat(email.text)).not.toMatch(/held (in escrow )?by/i);
      expect(flat(email.text)).not.toMatch(/we are holding|vallo is holding|we hold your/i);
    }
  });

  it("carries no em dash and no emoji", () => {
    for (const email of EVERY_EMAIL) {
      const both = email.subject + email.text;
      expect(both).not.toContain("—");
      expect(both).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it("prints money through the formatter and never as raw kobo", () => {
    const paid = heldPaymentPaidOut({
      ...base,
      viewer: "payee",
      commissionMinor: 12_500,
      netMinor: 237_500,
    });
    expect(flat(paid.text)).toContain("2,375");
    expect(paid.text).not.toContain("237500");
    expect(paid.text).not.toContain("250000");
  });

  it("gives the refund its own email, which never existed before", () => {
    const returned = heldPaymentReturned({ ...base, viewer: "payer" });
    expect(returned.subject).toMatch(/returned to you/);
    /* The text rendering hard-wraps its paragraphs, so a sentence is matched
       against the unwrapped text and not against the laid-out one. */
    expect(flat(returned.text)).toMatch(/back in your Vallo balance/);
  });

  it("puts the ruling in front of both sides word for word", () => {
    const ruling = "Neither side produced a record of an inspection, so the money goes back.";
    for (const viewer of PARTIES) {
      const email = heldPaymentRuling({
        ...base,
        viewer,
        direction: "refund",
        ruling,
        netMinor: 250_000,
        commissionMinor: 0,
      });
      expect(flat(email.text)).toContain(ruling);
    }
  });

  it("says a date in the payout emails and never a number of days", () => {
    const held = heldPaymentSetAside({
      ...base,
      viewer: "payer",
      autoReleaseAt: "2026-10-14T09:00:00Z",
    });
    expect(flat(held.text)).toContain("14 Oct 2026");
    expect(flat(held.text)).not.toMatch(/\b\d+\s*(day|days|week|weeks)\b/i);
  });
});
