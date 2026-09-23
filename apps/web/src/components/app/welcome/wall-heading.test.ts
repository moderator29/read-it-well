import { describe, expect, it } from "vitest";
import { getDictionary } from "@vallo/i18n";
import { looksLikePlace, wallHeading } from "./wall-heading";

const copy = getDictionary("en").shape.wall;

describe("the wall names what they asked for (V-18)", () => {
  it("a place search leads with Create an account and names the place", () => {
    const h = wallHeading({ kind: "search", place: "Lagos" }, copy);
    expect(`${h.titleA} ${h.titleB}`).toBe("Create an account to see homes in Lagos");
    expect(h.primary).toBe("sign-up");
  });

  it("a search that is not a place is quoted back as typed", () => {
    const h = wallHeading({ kind: "search", place: "2 bed under 3m" }, copy);
    expect(h.titleB).toBe("to see results for “2 bed under 3m”");
  });

  it("a search with no words says so without inventing one", () => {
    expect(wallHeading({ kind: "search", place: null }, copy).titleB).toBe("to see what is listed");
  });

  it("a shared listing, a stay and anything else lead with Sign in", () => {
    expect(wallHeading({ kind: "listing" }, copy)).toMatchObject({
      titleA: "Sign in",
      titleB: "to open this listing",
      primary: "sign-in",
    });
    expect(wallHeading({ kind: "stay" }, copy).titleB).toBe("to open this stay");
    expect(wallHeading({ kind: "other" }, copy).titleB).toBe("to open that page");
  });

  it("knows a place name from a query", () => {
    expect(looksLikePlace("Port Harcourt")).toBe(true);
    expect(looksLikePlace("Ọ̀yọ́")).toBe(true);
    expect(looksLikePlace("Lekki Phase 1")).toBe(false);
    expect(looksLikePlace("one two three four")).toBe(false);
  });

  it("carries no dash as punctuation", () => {
    for (const v of Object.values(copy)) expect(v).not.toMatch(/—|–/);
  });
});
