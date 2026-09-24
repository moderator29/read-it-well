import { describe, expect, it } from "vitest";
import { isPublicSafe, publicAreaName, publicTitle } from "./public-text";

describe("text a lister typed, before it reaches a public surface", () => {
  it("refuses streets, estates, house and plot numbers and landmarks", () => {
    for (const text of [
      "14 Admiralty Way",
      "Admiralty Way",
      "Chevron Drive",
      "Lekki Gardens Estate",
      "Bourdillon Road",
      "Allen Avenue",
      "Plot 12",
      "Block C4",
      "No. 3 Bode Thomas",
      "House 7",
      "opposite Shoprite",
      "Off Awolowo",
      "Victoria Garden City",
    ]) {
      expect(isPublicSafe(text), text).toBe(false);
      expect(publicAreaName(text), text).toBeNull();
    }
  });

  it("keeps neighbourhood names and ordinary titles", () => {
    for (const text of ["Yaba", "Lekki Phase 1", "Wuse 2", "Ikeja GRA", "Victoria Island", "Ogudu"]) {
      expect(publicAreaName(text), text).toBe(text);
    }
    expect(publicTitle("2 bedroom flat with a prepaid meter")).toBe("2 bedroom flat with a prepaid meter");
    expect(publicTitle("  Spacious   mini flat  ")).toBe("Spacious mini flat");
  });

  it("refuses nothing-at-all as well, so a blank never prints", () => {
    expect(isPublicSafe("")).toBe(false);
    expect(isPublicSafe(null)).toBe(false);
  });
});
