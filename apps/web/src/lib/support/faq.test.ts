import { describe, expect, it } from "vitest";
import { FULL_REFUND_HOURS } from "../trust/cancellation";
import { SUPPORT_FAQ, faqAnswerById, findFaqAnswer, findFaqEntry, searchFaq } from "./faq";

/**
 * The help store is the platform's word, so these hold the two properties that
 * decide whether it can be trusted: it says what the product does, and it can
 * still say nothing.
 *
 * The second one is the easy one to lose. A matcher that always finds something
 * is a support agent that never hands over to a person, and the way it happens
 * is never a decision: it is a scoring rule that lets ordinary English words
 * promote an entry on their own.
 */

describe("the store itself", () => {
  it("has a unique id, keywords and an answer on every entry", () => {
    const ids = new Set<string>();
    for (const entry of SUPPORT_FAQ) {
      expect(entry.id, "an entry with no id cannot be looked up").toBeTruthy();
      expect(ids.has(entry.id), `duplicate id ${entry.id}`).toBe(false);
      ids.add(entry.id);
      expect(entry.keywords.length).toBeGreaterThan(0);
      expect(entry.answer.trim().length).toBeGreaterThan(40);
    }
  });

  it("carries no em dash and none of the words a reader must never see", () => {
    // Built from its code point so this file does not itself contain the one
    // character the platform bans everywhere.
    const emDash = String.fromCharCode(0x2014);
    for (const entry of SUPPORT_FAQ) {
      expect(entry.answer, entry.id).not.toContain(emDash);
      expect(entry.answer.toLowerCase(), entry.id).not.toMatch(/\bdemo\b|\bsample\b|\bpreview\b/);
    }
  });

  it("keeps every keyword lower case, because matching lower cases the question", () => {
    for (const entry of SUPPORT_FAQ) {
      for (const keyword of entry.keywords) {
        expect(keyword, `${entry.id}: ${keyword}`).toBe(keyword.toLowerCase());
      }
    }
  });
});

describe("what the store says about money", () => {
  /*
   * The cancellations answer used to describe a free-cancellation deadline set
   * by each listing, and a full refund before it. RentMe has one schedule for
   * the whole platform, and this is the check that keeps the paragraph and the
   * arithmetic in `lib/trust/cancellation.ts` from drifting apart again.
   */
  it("states the one schedule, with the hours the refund maths actually uses", () => {
    const answer = faqAnswerById("cancellations") ?? "";
    expect(answer).toContain(`${FULL_REFUND_HOURS} hours before check-in`);
    expect(answer).toContain("free-cancellation deadline");
    expect(answer).toMatch(/not a different one for each host/i);
    expect(answer).not.toMatch(/that listing's cancellation policy/i);
  });

  it("never implies RentMe takes a cut", () => {
    const answer = faqAnswerById("charges") ?? "";
    expect(answer).toMatch(/charges nothing/i);
  });

  it("says every listing came from a person on the platform", () => {
    const answer = faqAnswerById("where-listings-come-from") ?? "";
    expect(answer).toMatch(/real person/i);
    expect(answer).toMatch(/import nothing/i);
  });
});

describe("matching a question", () => {
  it("answers the question that was asked, not the first one that shares a word", () => {
    /* "How do I cancel my booking?" contains "book". The booking entry sits
       above the cancellations entry, and first-match ordering answered this
       with how to make a reservation. */
    expect(findFaqEntry("How do I cancel my booking?")?.id).toBe("cancellations");
  });

  it("does not read a stem out of the middle of a longer word", () => {
    /* "hi" is inside "this" and "which"; "hey" is inside "they". Substring
       matching scored the greeting on questions that were not greetings. */
    expect(findFaqEntry("Is this refundable?")?.id).toBe("refunds");
    expect(findFaqEntry("Which agent do they send?")?.id).not.toBe("greeting");
    expect(findFaqEntry("Hello")?.id).toBe("greeting");
  });

  it("still reads a stem past the end of a word, because that is what a stem is for", () => {
    expect(findFaqEntry("Is this listing verified?")?.id).toBe("verified-badge");
    expect(findFaqEntry("Where are my bookings?")?.id).toBe("booking");
  });

  it("returns nothing when nothing fits, so the chat can hand over", () => {
    expect(findFaqEntry("What is the capital of Mongolia?")).toBeNull();
    expect(findFaqAnswer("qwertyuiop")).toBeNull();
    expect(searchFaq("What is the capital of Mongolia?")).toEqual([]);
  });

  it("ranks rather than takes the first, and respects the limit", () => {
    const ranked = searchFaq("my wallet balance and my booking", 2);
    expect(ranked.length).toBe(2);
    expect(ranked[0]?.id).toBe("wallet");
  });

  it("finds the entries a person in trouble actually asks for", () => {
    expect(findFaqEntry("Where is my refund?")?.id).toBe("refunds");
    expect(findFaqEntry("Somebody asked me to pay outside RentMe")?.id).toBe("messaging-safety");
    expect(findFaqEntry("What happened to my ticket?")?.id).toBe("tickets");
    expect(findFaqEntry("I could not get in to the flat")?.id).toBe("arrival");
    expect(findFaqEntry("How do I review my stay?")?.id).toBe("reviews");
  });

  it("takes an empty question as no answer rather than as the first entry", () => {
    expect(findFaqEntry("")).toBeNull();
    expect(searchFaq("")).toEqual([]);
  });
});

describe("faqAnswerById", () => {
  it("returns the canonical answer, and null for an id that is gone", () => {
    expect(faqAnswerById("wallet")).toContain("Wallet tab");
    expect(faqAnswerById("no-such-entry")).toBeNull();
  });
});
