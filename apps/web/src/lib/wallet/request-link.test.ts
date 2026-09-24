import { describe, expect, it } from "vitest";
import { handleFromRecipientParam, walletRequestLink } from "./request-link";

describe("walletRequestLink (the /wallet/receive share)", () => {
  it("names the requester by handle and never by email", () => {
    const link = walletRequestLink({
      origin: "https://www.vallospaces.com",
      handle: "ada",
      amountNaira: 5000,
      note: "rent share",
    });
    expect(link).toBe("https://www.vallospaces.com/wallet/send?to=%40ada&amount=5000&note=rent+share");
    expect(link).not.toMatch(/%40.*\.|@.*\./);
  });

  it("carries no recipient at all without a handle", () => {
    expect(walletRequestLink({ origin: "https://x", handle: null, amountNaira: null, note: "" })).toBe(
      "https://x/wallet/send",
    );
  });
});

describe("handleFromRecipientParam", () => {
  it("reads @handle and nothing else", () => {
    expect(handleFromRecipientParam("@Ada")).toBe("ada");
    expect(handleFromRecipientParam("ada@example.com")).toBeNull();
    expect(handleFromRecipientParam("@ab")).toBeNull();
    expect(handleFromRecipientParam("@9lives")).toBeNull();
    expect(handleFromRecipientParam(undefined)).toBeNull();
  });
});
