import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UX-25: the auth emails said every listing was put up by a real person and
 * that you could browse before telling anybody anything. Neither was true:
 * the listings are examples from one platform account, and browsing sits
 * behind sign-in. The emails say what is true instead.
 */
const DIR = join(process.cwd(), "..", "..", "supabase", "templates");
const FILES = readdirSync(DIR).filter((name) => /\.(html|txt)$/.test(name));

describe("the auth emails promise only what is true", () => {
  it.each(FILES)("%s", (name) => {
    const text = readFileSync(join(DIR, name), "utf8").replace(/\s+/g, " ");
    expect(text).not.toMatch(/put up by a real person/i);
    expect(text).not.toMatch(/nothing is imported from an outside feed/i);
    expect(text).not.toMatch(/always somebody to message/i);
    expect(text).not.toMatch(/browse as much as you like before you tell anybody/i);
  });

  it("says plainly that the examples cannot be rented or booked", () => {
    for (const name of ["confirmation.html", "confirmation.txt", "invite.html", "invite.txt"]) {
      const text = readFileSync(join(DIR, name), "utf8").replace(/\s+/g, " ");
      expect(text, name).toContain("Places marked Example are there to show how Vallo works and cannot be rented or booked.");
    }
  });
});
