import { describe, expect, it } from "vitest";
import { parseRecipientInput } from "./recipient-input";

describe("parseRecipientInput", () => {
  it("reads an address and a handle, lower-cased", () => {
    expect(parseRecipientInput(" Tunde@Example.com ")).toEqual({ kind: "email", email: "tunde@example.com" });
    expect(parseRecipientInput("@Tunde_1")).toEqual({ kind: "handle", handle: "tunde_1" });
  });
  it("refuses a half-typed address and a malformed handle", () => {
    expect(parseRecipientInput("tunde@")).toBeNull();
    expect(parseRecipientInput("@a")).toBeNull();
    expect(parseRecipientInput("@1abc")).toBeNull();
    expect(parseRecipientInput(42)).toBeNull();
  });
});
