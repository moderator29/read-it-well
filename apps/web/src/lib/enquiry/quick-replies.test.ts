import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { moveInReply, quickReplies } from "./quick-replies";

const copy = getDictionary("en").frontDoor.desk.quick;

const flat = {
  intent: "rent" as const,
  priceMinor: 250_000_000,
  pricePeriod: "year" as const,
  moveInCostMinor: 320_000_000,
  moveInCostStated: true,
  cautionDepositMinor: 25_000_000,
  agencyFeeMinor: 25_000_000,
  legalFeeMinor: 20_000_000,
};

describe("the move-in reply", () => {
  it("quotes the stated total and only the parts the lister named", () => {
    const text = moveInReply(flat, copy, "en");
    expect(text).toMatch(/^To move in you need ₦3,200,000: rent ₦2,500,000 a year, caution ₦250,000, agency fee ₦250,000, legal fee ₦200,000\.$/);
    expect(text).not.toMatch(/service|agreement/);
  });

  it("says at least when the total is only the sum of the parts", () => {
    expect(moveInReply({ ...flat, moveInCostStated: false }, copy, "en")).toMatch(/^To move in you need at least/);
  });

  it("offers no move-in reply when nothing is stated, and none on a sale", () => {
    expect(moveInReply({ intent: "rent", priceMinor: 0 }, copy, "en")).toBeNull();
    expect(moveInReply({ ...flat, intent: "sale" }, copy, "en")).toBeNull();
  });
});

describe("the tray", () => {
  it("leads with the move-in reply and always carries the other three", () => {
    expect(quickReplies(flat, copy, "en").map((r) => r.key)).toEqual(["move_in", "viewing", "available", "let"]);
    expect(quickReplies(null, copy, "en").map((r) => r.key)).toEqual(["viewing", "available", "let"]);
  });
});
