import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import {
  composeRentMessage,
  composeVacancyMessage,
  isAnswerFor,
  parseReply,
  redactToken,
  replyPath,
} from "./message";

const landlordEn = getDictionary("en").landlord;

const TOKEN = "Abc123_-Abc123_-Abc123_-Abc123_-";

describe("the message a landlord is sent", () => {
  it("asks the vacancy question with the code beside every option and the link", () => {
    const body = composeVacancyMessage(landlordEn.sms, {
      place: "2 bedroom apartment in Ikeja GRA",
      code: "K7RX",
      link: `https://www.vallospaces.com${replyPath(TOKEN)}`,
    });
    expect(body).toContain("is your 2 bedroom apartment in Ikeja GRA still available to let?");
    expect(body.match(/K7RX/g)).toHaveLength(3);
    expect(body).toContain(`/landlord/${TOKEN}`);
    expect(body).not.toMatch(/\{\w+\}/);
  });

  it("never names the agent: the name is text a lister typed (rule 10)", () => {
    const body = composeVacancyMessage(landlordEn.sms, { place: "flat in Yaba", code: "ACDE", link: "x" });
    expect(body).toContain("is your flat in Yaba still available to let?");
    expect(`${landlordEn.sms.vacancy} ${landlordEn.sms.rent}`).not.toMatch(/\{agent|listed by|through \{/);
  });

  it("states the rent total it was handed and the two answers", () => {
    const body = composeRentMessage(landlordEn.sms, {
      place: "2 bedroom apartment in Ikeja GRA",
      total: "₦2,800,000",
      code: "K7RX",
      link: "https://x/landlord/t",
    });
    expect(body).toContain("a tenant has paid ₦2,800,000 for your 2 bedroom apartment in Ikeja GRA.");
    expect(body).toContain("Reply 1 K7RX if that is right, 2 K7RX if it is not what you agreed.");
  });

  it("never carries a street, a number or a phone in its own words", () => {
    const words = `${landlordEn.sms.vacancy} ${landlordEn.sms.rent}`;
    expect(words).not.toMatch(/\+234|address|street/i);
    expect(words).not.toContain("—");
  });
});

describe("the token never reaches storage", () => {
  it("redacts every reply-page token in a body", () => {
    const body = `answer here: https://www.vallospaces.com/landlord/${TOKEN} or https://x/landlord/${TOKEN}`;
    const stored = redactToken(body);
    expect(stored).not.toContain(TOKEN);
    expect(stored).toContain("/landlord/[link]");
    // The database refuses exactly this pattern, so a redacted body passes it.
    expect(stored).not.toMatch(/\/landlord\/[A-Za-z0-9_-]{16,}/);
  });
});

describe("reading what a landlord typed back", () => {
  it.each([
    ["1", { kind: "answer", digit: 1, code: null }],
    ["2.", { kind: "answer", digit: 2, code: null }],
    ["1 K7RX", { kind: "answer", digit: 1, code: "K7RX" }],
    ["1k7rx", { kind: "answer", digit: 1, code: "K7RX" }],
    ["K7RX 3", { kind: "answer", digit: 3, code: "K7RX" }],
    ["  stop ", { kind: "stop" }],
    ["STOP", { kind: "stop" }],
    ["Please stop texting me", { kind: "stop" }],
    ["2 stop", { kind: "stop" }],
    ["1 K7RX STOP", { kind: "stop" }],
    ["unsubscribe", { kind: "stop" }],
    ["quit.", { kind: "stop" }],
    ["END", { kind: "stop" }],
    ["cancel", { kind: "stop" }],
  ])("reads %j", (text, expected) => {
    expect(parseReply(text)).toEqual(expected);
  });

  it.each(["4", "yes", "1 2", "12", "1 KBOX", "", "please call me", "1 K7RXX", "stopping by later is fine? 1", "The END", "cancel the viewing, 1", "end of month 2"])("refuses to guess at %j", (text) => {
    expect(parseReply(text)).toBeNull();
  });

  it("knows which answers belong to which question", () => {
    expect(isAnswerFor("vacancy", "let")).toBe(true);
    expect(isAnswerFor("vacancy", "confirmed")).toBe(false);
    expect(isAnswerFor("rent", "disputed")).toBe(true);
    expect(isAnswerFor("rent", "available")).toBe(false);
  });
});
