import { describe, expect, it } from "vitest";
import { fundingStep, verifyPath } from "./funding-step";

describe("fundingStep", () => {
  it("sends the browser to the bank's challenge when there is a URL", () => {
    expect(fundingStep({ reference: "ref_1", authorizationUrl: "https://checkout.example/x" })).toEqual({
      kind: "hosted",
      url: "https://checkout.example/x",
    });
  });

  it("verifies under the reference when the card was charged there and then", () => {
    expect(fundingStep({ reference: "ref_2", authorizationUrl: "" })).toEqual({
      kind: "verify",
      reference: "ref_2",
    });
  });

  it("treats a blank URL as no URL", () => {
    expect(fundingStep({ reference: "ref_3", authorizationUrl: "   " })).toEqual({
      kind: "verify",
      reference: "ref_3",
    });
  });

  it("escapes the reference into the verify path", () => {
    expect(verifyPath("ref/4 5")).toBe("/wallet?funded=1&reference=ref%2F4%205");
  });
});
