import { describe, expect, it } from "vitest";
import { CONTENT_REFUSED_CODE, contentRefusal } from "./content-refusal";

describe("contentRefusal", () => {
  it("passes the database's sentence through for RM004", () => {
    expect(
      contentRefusal({ code: CONTENT_REFUSED_CODE, message: "Your review uses words our content standards do not allow." }),
    ).toBe("Your review uses words our content standards do not allow.");
  });

  it("falls back to a sentence when RM004 arrives without one", () => {
    expect(contentRefusal({ code: "RM004", message: "" })).toMatch(/content standards/);
  });

  it("is null for every other failure, so those keep their own copy", () => {
    expect(contentRefusal({ code: "23505", message: "duplicate key" })).toBeNull();
    expect(contentRefusal({ code: "42501", message: "rls" })).toBeNull();
    expect(contentRefusal(null)).toBeNull();
  });
});
