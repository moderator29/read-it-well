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
  it("never prints a phone number, an email or a link", () => {
    expect(firstNameAndInitial("Call08031234567 Homes")).toBe("Homes");
    expect(firstNameAndInitial("08031234567")).toBeNull();
    expect(firstNameAndInitial("+234 803 123 4567")).toBeNull();
    expect(firstNameAndInitial("ade@gmail.com")).toBeNull();
    expect(firstNameAndInitial("wa.me/2348031234567")).toBeNull();
    expect(firstNameAndInitial("https://vallo-homes.ng Tunde")).toBe("Tunde");
    expect(firstNameAndInitial("Tunde www.tunde.ng")).toBe("Tunde");
  });
  it("keeps names with apostrophes and hyphens, and caps a long first word", () => {
    expect(firstNameAndInitial("Ngozi-Ada O'Neil")).toBe("Ngozi-Ada O.");
    expect(firstNameAndInitial("Abcdefghijklmnopqrstuvwxyz")).toBe("Abcdefghijklmnopqrst");
    expect(firstNameAndInitial("!!!")).toBeNull();
  });
});
