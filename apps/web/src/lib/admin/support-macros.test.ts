import { describe, expect, it } from "vitest";
import { bannedPhrasesIn } from "../design/voice";
import { BANNED_IN_EXAMPLE_COPY, firstBannedPhrase } from "../copy/banned-phrases";
import { fillMacro, macroById, SUPPORT_MACROS } from "./support-macros";

/**
 * A saved reply goes out under a person's name to a member who is usually
 * worried. These are the rules it is held to.
 */
describe("saved replies", () => {
  it("have unique ids and titles short enough for a chip", () => {
    expect(new Set(SUPPORT_MACROS.map((m) => m.id)).size).toBe(SUPPORT_MACROS.length);
    for (const m of SUPPORT_MACROS) expect(m.title.length).toBeLessThanOrEqual(28);
  });

  it.each(SUPPORT_MACROS.map((m) => [m.id, m] as const))("%s is short, calm and in the product's voice", (_id, m) => {
    const text = fillMacro(m, { firstName: "Ada", reference: "NF-SUP-7K2Q" });
    expect(text.length).toBeLessThanOrEqual(600);
    expect(text).not.toMatch(/!/);
    expect(text).not.toContain("—");
    expect(bannedPhrasesIn(text)).toEqual([]);
    expect(firstBannedPhrase(text)).toBeNull();
    expect(firstBannedPhrase(text, BANNED_IN_EXAMPLE_COPY)).toBeNull();
    expect(text).not.toMatch(/sorry for (the|any) inconvenience|dear (customer|sir|madam)|kindly/i);
  });

  it("never ask for a password, a code, a PIN or a card number", () => {
    /* Sentence by sentence: a refusal in one sentence must not excuse an ask in another. */
    const asks = /\b(send|share|give|tell|provide|reply with|type|enter|confirm)\b[^.?]*\b(password|code|otp|pin|card number|card details|cvv)\b/i;
    /* "Please do not send a password" is the opposite of asking, and is allowed. */
    const refusal = /\b(do not|never|don't)\b[^.?]*\b(password|code|card number)\b/i;
    for (const m of SUPPORT_MACROS) {
      for (const sentence of m.body.split(/(?<=[.?])\s+/)) {
        if (asks.test(sentence)) expect(refusal.test(sentence), `${m.id}: ${sentence}`).toBe(true);
      }
    }
  });

  it("never suggest paying or talking outside Vallo, and never describe Vallo as holding money", () => {
    for (const m of SUPPORT_MACROS) {
      expect(m.body).not.toMatch(/\b(whatsapp|call me on|bank transfer to|pay (me|us) directly|your (vallo )?balance|wallet)\b/i);
      expect(m.body).not.toMatch(/vallo (holds|is holding|keeps) your money/i);
    }
  });

  it("fill the member's first name and the reference, and never leave a placeholder", () => {
    const m = macroById("first-reply")!;
    const text = fillMacro(m, { firstName: "Ada Obi", reference: "NF-SUP-1" });
    expect(text).toMatch(/^Hello Ada,/);
    expect(text).toContain("NF-SUP-1");
    const bare = fillMacro(m, { firstName: "  ", reference: null });
    expect(bare).toMatch(/^Hello there,/);
    expect(bare).toContain("your ticket");
    for (const macro of SUPPORT_MACROS) expect(fillMacro(macro, {})).not.toMatch(/\{[a-z_]+\}/);
  });

  it("offer one that resolves, and the rest keep the ticket open", () => {
    expect(SUPPORT_MACROS.filter((m) => m.then === "resolve").map((m) => m.id)).toEqual(["resolved"]);
  });
});
