import { describe, expect, it, vi } from "vitest";
import { ANON_DENIED_POINT_COLUMNS, pointSelect, withPublicPoint } from "./public-point";

vi.mock("server-only", () => ({}));

const { LISTING_SELECTS } = await import("../listings/supabase-repository");

/** Column and alias entries of a PostgREST select, joins stripped. */
function entries(select: string): string[] {
  return select
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.includes("(") && !part.includes(")"));
}

const signedOut = { auth: { getSession: async () => ({ data: { session: null }, error: null }) } } as never;
const signedIn = {
  auth: { getSession: async () => ({ data: { session: { access_token: "x" } }, error: null }) },
} as never;

/*
 * NEW-A4-01: `anon` cannot select the exact point on listings, accommodations,
 * businesses or catalogue_entries, and PostgREST refuses a whole read that
 * names one denied column. So a signed-out read must name the public twins.
 */
describe("the point a signed-out reader asks for", () => {
  it("names no exact point column in any signed-out listing read", async () => {
    for (const select of [LISTING_SELECTS.card, LISTING_SELECTS.detail]) {
      const asked = entries(await pointSelect(signedOut, select));
      for (const denied of ANON_DENIED_POINT_COLUMNS) expect(asked).not.toContain(denied);
      expect(asked).toContain("latitude:latitude_public");
      expect(asked).toContain("longitude:longitude_public");
    }
  });

  it("gives a signed-in reader the public point too", async () => {
    const asked = entries(await pointSelect(signedIn, LISTING_SELECTS.card));
    for (const denied of ANON_DENIED_POINT_COLUMNS) expect(asked).not.toContain(denied);
    expect(asked).toContain("latitude:latitude_public");
  });

  it("rewrites a one-line column list and leaves other columns alone", () => {
    expect(withPublicPoint("id, name, latitude, longitude, is_demo")).toBe(
      "id, name, latitude:latitude_public, longitude:longitude_public, is_demo",
    );
    expect(withPublicPoint("id, latitude_public")).toBe("id, latitude_public");
  });
});
