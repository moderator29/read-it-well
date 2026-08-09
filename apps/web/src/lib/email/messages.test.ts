import { describe, expect, it } from "vitest";

import { EVERY_MESSAGE } from "./fixtures";
import {
  escrowFunded,
  inspectionScheduled,
  listingRejected,
  verificationCode,
  walletFunded,
  welcome,
  withdrawalOutcome,
} from "./messages";
import { greetingName, hello, money } from "./render";

/**
 * The invariants that hold for every message, checked against every message.
 *
 * These are the rules that are easy to state, easy to agree with, and
 * impossible to keep by hand across a catalogue that grows. Each one below has
 * been broken by a real email system at some point, which is the only reason
 * it is worth a test:
 *
 *   an inbox preview line that was never set, so the client shows the first
 *   forty characters of markup;
 *   a template that renders "Hello ," because a name was blank;
 *   a text alternative that was forgotten on the newest message and only that
 *   one, which is exactly the message that then lands in spam;
 *   an em dash that arrived by autocorrect.
 *
 * Everything is exercised through the real functions with real data, so the
 * assertions are about output rather than about implementation.
 */

/**
 * Text as one line.
 *
 * The plain text part is wrapped to a readable measure, so a sentence the
 * copy contains is split across lines and a naive `toContain` misses it. Every
 * assertion about wording goes through this, which tests the words rather than
 * where the wrapper happened to break them.
 */
const flat = (text: string): string => text.replace(/\s+/g, " ").trim();

/**
 * One representative call per message in the catalogue.
 *
 * Imported rather than written here. `shell.test.ts` needs the same matrix to
 * check the markup, and two lists enumerating the same catalogue drift within a
 * month: somebody adds a message, adds it to one list, and the message that
 * ships without a text alternative is the new one. fixtures.ts is the single
 * list, and shell.test.ts fails when the catalogue exports something it has no
 * entry for.
 */
describe("every message in the catalogue", () => {
  it.each(EVERY_MESSAGE)("$name carries a plain text alternative", ({ message }) => {
    expect(message.text.trim().length).toBeGreaterThan(0);
    // Not markup. A text part that is really HTML is worse than none, because
    // a text-only client then shows tags.
    expect(message.text).not.toContain("<td");
    expect(message.text).not.toContain("<!doctype");
  });

  it.each(EVERY_MESSAGE)("$name sets an inbox preview line", ({ message }) => {
    /*
     * The preheader is the hidden span immediately after <body>. Asserted by
     * position rather than by content, because what matters is that a client
     * showing "the first text in the message" shows a sentence somebody wrote
     * rather than the beginning of the layout.
     */
    const body = message.html.slice(message.html.indexOf("<body"));
    const span = body.match(/<span style="display:none[^"]*">([^<]*)<\/span>/);
    expect(span).not.toBeNull();
    expect((span?.[1] ?? "").trim().length).toBeGreaterThan(0);
  });

  it.each(EVERY_MESSAGE)("$name has a subject that is not empty", ({ message }) => {
    expect(message.subject.trim().length).toBeGreaterThan(0);
    // A subject longer than this is truncated by every mobile client, so the
    // end of it is decoration rather than communication.
    expect(message.subject.length).toBeLessThanOrEqual(90);
  });

  it.each(EVERY_MESSAGE)("$name contains no em dash", ({ message }) => {
    // Written as an escape rather than as the character, so this file does not
    // itself contain the thing it forbids and cannot be found by a grep for it.
    const EM_DASH = "\u2014";
    const EN_DASH = "\u2013";
    for (const part of [message.subject, message.html, message.text]) {
      expect(part).not.toContain(EM_DASH);
      expect(part).not.toContain(EN_DASH);
    }
  });

  it.each(EVERY_MESSAGE)("$name uses no emoji", ({ message }) => {
    // Anything above the basic multilingual plane, plus the two symbol blocks
    // an emoji actually lives in.
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emoji.test(message.subject)).toBe(false);
    expect(emoji.test(message.text)).toBe(false);
  });

  it.each(EVERY_MESSAGE)("$name is light and dark aware", ({ message }) => {
    expect(message.html).toContain('name="color-scheme" content="light dark"');
    expect(message.html).toContain("@media (prefers-color-scheme: dark)");
  });

  it.each(EVERY_MESSAGE)("$name puts no words inside an image", ({ message }) => {
    /*
     * The only <img> in the shell is the logo mark, and its alt is empty
     * because the wordmark beside it is live text. Any image carrying copy
     * would need alt text, so an img with a non-empty alt is the signal that
     * somebody has put words in a picture.
     */
    const images = message.html.match(/<img\b[^>]*>/g) ?? [];
    for (const img of images) {
      expect(img).toContain('alt=""');
    }
  });
});

describe("the greeting can never render Hello comma", () => {
  const nameless = [undefined, null, "", "   ", "\t\n"];

  it.each(nameless)("falls back rather than greeting nobody (%j)", (value) => {
    const greeting = hello(value as string | null | undefined);
    expect(greeting).toBe("Hello there.");
    expect(greeting).not.toMatch(/Hello\s*[,.]?\s*$/);
  });

  it("never greets somebody by their email address", () => {
    // Supabase fills user_metadata.full_name with the address when a provider
    // returns no name, so this is a real value that reaches this function.
    expect(greetingName("ada.obi@gmail.com")).toBeNull();
    expect(hello("ada.obi@gmail.com")).toBe("Hello there.");
  });

  it("greets by first name only", () => {
    expect(hello("Adaeze Chinwe Obi")).toBe("Hello Adaeze.");
  });

  it("does not let a pasted paragraph become the greeting", () => {
    const long = "x".repeat(500);
    expect((greetingName(long) ?? "").length).toBeLessThanOrEqual(40);
  });

  it("reaches every message that takes a name", () => {
    // The welcome is the one somebody reads first, so it is the one where a
    // broken greeting does the most damage.
    expect(flat(welcome({ role: "renter" }).text)).toContain("Hello there.");
    expect(flat(welcome({ name: "  Ada  ", role: "renter" }).text)).toContain("Hello Ada.");
  });
});

describe("money never reaches a reader as kobo", () => {
  it("formats an exact amount to the kobo", () => {
    expect(money(500_000)).toContain("5,000");
    expect(money(500_050)).toMatch(/\.50$/);
  });

  it("prints the same figure in both renderings", () => {
    const m = walletFunded({ ownerName: "Ada", amountMinor: 123_456, balanceMinor: 999_900 });
    const amount = money(123_456);
    expect(m.html).toContain(amount);
    expect(m.text).toContain(amount);
  });
});

describe("the messages that carry a promise", () => {
  it("a rejection always states the reviewer's reason", () => {
    const reason = "The photographs are of a different building from the one in the address.";
    const m = listingRejected({ listingTitle: "A flat", reason });
    expect(flat(m.text)).toContain(reason);
    expect(m.html).toContain("different building");
  });

  it("an escrow receipt says the money has not been paid to anybody", () => {
    const m = escrowFunded({
      listingTitle: "A flat",
      amountMinor: 100_000,
      reference: "NF-ESC-1",
      releaseCondition: "you confirm you have the keys",
    });
    expect(flat(m.text)).toMatch(/has not been paid to the lister/i);
    expect(flat(m.text)).toContain("you confirm you have the keys");
  });

  it("a code email offers nothing to click", () => {
    /*
     * A code email teaches somebody what a code email looks like, and every
     * phishing message that follows copies it. If the real one has a button,
     * the reader has been trained to press one.
     */
    const m = verificationCode({ code: "482 913", expiresInMinutes: 10 });
    expect(m.html).not.toContain("<a href");
    expect(m.subject).toContain("482 913");
  });

  it("an inspection email tells the viewer not to carry money", () => {
    const m = inspectionScheduled({
      audience: "viewer",
      listingTitle: "A flat",
      address: "Somewhere",
      date: "2026-08-15",
      time: "11:30",
    });
    expect(flat(m.text)).toMatch(/do not carry money/i);
  });

  it("a withdrawal that was reversed is not described as a failure", () => {
    const reversed = withdrawalOutcome({ outcome: "reversed", amountMinor: 1000 });
    // Somebody's statement shows a debit and then a credit. Telling them it
    // failed is how a support ticket starts.
    expect(flat(reversed.text)).toMatch(/sent it back/i);
  });

  it("the welcome for a buyer refuses to vouch for a title", () => {
    const m = welcome({ role: "buyer" });
    expect(flat(m.text)).toMatch(/cannot verify it/i);
    expect(flat(m.text)).toMatch(/land registry/i);
  });
});
