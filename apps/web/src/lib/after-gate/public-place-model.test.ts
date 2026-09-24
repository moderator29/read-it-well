import { describe, expect, it } from "vitest";
import { firstNameAndInitial, placeFrom } from "./public-place-model";

describe("placeFrom", () => {
  it("prints a listed neighbourhood in the list's spelling, with its state", () => {
    expect(placeFrom("  yaba ", "Lagos", "LA", "Lagos", "Nigeria")).toBe("Yaba, Lagos");
  });
  it("falls back to the listed city when the area is off the list", () => {
    expect(placeFrom("14 Admiralty Way, Lekki", "lagos", "LA", "Lagos", "Nigeria")).toBe("Lagos");
  });
  it("falls back to the state when the city is off the list too", () => {
    expect(placeFrom("Plot 5 behind the church", "Our Estate", "LA", "Lagos", "Nigeria")).toBe("Lagos");
  });
  it("falls back to the country when nothing is listed and the state is unknown", () => {
    expect(placeFrom("Plot 5", "Our Estate", null, null, "Nigeria")).toBe("Nigeria");
  });
});

describe("firstNameAndInitial", () => {
  it("keeps the first name and the last initial", () => {
    expect(firstNameAndInitial("  adaeze   Okafor ")).toBe("adaeze O.");
    expect(firstNameAndInitial("Tunde Bakare Properties Ltd")).toBe("Tunde L.");
  });
  it("keeps a single word and refuses nothing typed", () => {
    expect(firstNameAndInitial("Chidi")).toBe("Chidi");
    expect(firstNameAndInitial("  ")).toBeNull();
    expect(firstNameAndInitial("12 34")).toBeNull();
  });
});
