import { describe, expect, it } from "vitest";
import { isClosedListingRefusal } from "./closed";

describe("isClosedListingRefusal", () => {
  it("knows the closed-listing trigger", () => {
    expect(
      isClosedListingRefusal({
        code: "23514",
        message: "This listing was closed, and a closed listing stays closed. List the property again as a new listing.",
      }),
    ).toBe(true);
  });
  it("leaves every other check violation alone", () => {
    expect(isClosedListingRefusal({ code: "23514", message: "listings_backup_hours_need_backup_chk" })).toBe(false);
    expect(isClosedListingRefusal({ code: "42501", message: "a closed listing stays closed" })).toBe(false);
    expect(isClosedListingRefusal(null)).toBe(false);
  });
});
