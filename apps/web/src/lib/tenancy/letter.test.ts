import { describe, expect, it } from "vitest";
import { demandLetter, mailtoHref, type LetterFacts } from "./letter";

const facts: LetterFacts = {
  tenantName: "Ada O.",
  listerName: "Musa Okafor",
  area: "Yaba, Lagos",
  period: { from: "Mon 2 Nov 2026", to: "Tue 2 Nov 2027" },
  cautionPaid: "₦560,000",
  returned: "₦0",
  deducted: "₦60,000",
  outstanding: "₦500,000",
  dueOn: "Thu 2 Dec 2027",
  respondBy: "Sat 1 Jan 2028",
  disputed: ["Kitchen: ₦40,000"],
  verifyUrl: "https://vallospaces.com/r",
  today: "Sun 2 Jan 2028",
};

describe("demandLetter", () => {
  it("is built from the record: owed, due, respond-by and the disputed lines", () => {
    const { subject, body } = demandLetter(facts);
    expect(subject).toBe("Caution deposit owed: ₦500,000, due Thu 2 Dec 2027");
    expect(body).toContain("₦500,000 is still owed");
    expect(body).toContain("by Sat 1 Jan 2028");
    expect(body).toContain("- Kitchen: ₦40,000");
    expect(body).toContain("look the payment up at https://vallospaces.com/r");
    expect(body).toContain("To Musa Okafor,");
  });
  it("never names an address, and marks the tenant's own words as theirs", () => {
    const { body } = demandLetter(facts, "  The flat was left clean.  ");
    expect(body).toContain("In my own words:\nThe flat was left clean.");
    expect(body).not.toMatch(/street|close|avenue|road/i);
  });
  it("leaves out empty parts", () => {
    const { body } = demandLetter({ ...facts, disputed: [], verifyUrl: null, listerName: null }, "   ");
    expect(body).not.toContain("disputed");
    expect(body).not.toContain("receipt code");
    expect(body).not.toContain("In my own words");
    expect(body).toContain("To the lister,");
  });
});

describe("mailtoHref", () => {
  it("fills subject and body and no recipient", () => {
    const href = mailtoHref({ subject: "A & B", body: "line one\nline two" });
    expect(href.startsWith("mailto:?subject=A%20%26%20B&body=")).toBe(true);
    expect(href).toContain("line%20one%0Aline%20two");
  });
});
