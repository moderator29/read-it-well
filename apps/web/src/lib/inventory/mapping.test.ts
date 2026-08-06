import { describe, expect, it } from "vitest";
import { PARTNER_CITIES, cityForFilter, resolveCity } from "./mapping";

/**
 * Place resolution, which decides where a search actually looks.
 *
 * The failure this guards against is silent and it already happened once: the
 * covered list held six cities, so a search naming any of the other
 * thirty-one states fetched Lagos, failed the shared free-text filter, and
 * returned an empty page. Nobody sees an error. A visitor reads it as "there
 * is nothing in Kano" when the truth is that nothing ever looked in Kano.
 *
 * The state names below are checked against a literal list rather than against
 * the database, because a unit test cannot reach Postgres. They were verified
 * against `public.states` when written: 37 in the table, 37 here, no
 * difference in either direction. If this ever fails, check the table before
 * changing the list.
 */

/** Exactly `select name from public.states order by name`. */
const STATES_IN_DATABASE = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

describe("every state is reachable", () => {
  it("covers the 36 states and the FCT, with no extras", () => {
    const covered = PARTNER_CITIES.map((c) => c.state).sort();
    expect(covered).toEqual([...STATES_IN_DATABASE].sort());
  });

  it("names each state exactly as the database does", () => {
    /* `Listing.state` is filled from `public.states.name` and the shared
       free-text matcher searches that string. "FCT" here against
       "FCT (Abuja)" in the table would stop a state's own listings matching
       its own name, and nothing would report it. */
    for (const city of PARTNER_CITIES) {
      expect(STATES_IN_DATABASE).toContain(city.state);
    }
  });

  it("resolves every state by its own name", () => {
    for (const state of STATES_IN_DATABASE) {
      expect(resolveCity(`hotels in ${state}`)?.state).toBe(state);
    }
  });

  it("resolves every capital by its own name", () => {
    for (const city of PARTNER_CITIES) {
      expect(resolveCity(city.name.toLowerCase())?.name).toBe(city.name);
    }
  });

  it("resolves each alias to the state that owns it", () => {
    for (const city of PARTNER_CITIES) {
      for (const alias of city.aliases) {
        const found = resolveCity(alias);
        expect(found, `${alias} should resolve`).not.toBeNull();
        expect(found!.state, `${alias} belongs to ${city.state}`).toBe(city.state);
      }
    }
  });

  it("puts a real coordinate on every entry", () => {
    for (const city of PARTNER_CITIES) {
      // Nigeria's bounding box, roughly. A zero or a transposed pair would
      // place a search in the Gulf of Guinea and return nothing, quietly.
      expect(city.lat, city.name).toBeGreaterThan(4);
      expect(city.lat, city.name).toBeLessThan(14);
      expect(city.lng, city.name).toBeGreaterThan(2.5);
      expect(city.lng, city.name).toBeLessThan(14.7);
    }
  });

  it("gives every entry a distinct place", () => {
    const seen = new Set(PARTNER_CITIES.map((c) => `${c.lat},${c.lng}`));
    expect(seen.size).toBe(PARTNER_CITIES.length);
  });
});

describe("when the query names nowhere we cover", () => {
  it("falls back to Lagos, which leads the market", () => {
    expect(cityForFilter({}).state).toBe("Lagos");
    expect(cityForFilter({ q: "somewhere nobody has heard of" }).state).toBe("Lagos");
  });

  it("does not let a substring of a longer word steal the search", () => {
    /* Every one of these was a real miss before the matcher moved to whole
       words. "Ondo" sits inside "London", "aba" inside both "Taraba" and
       Delta's own capital "Asaba", and "Kano" inside "Kanoland". */
    expect(resolveCity("london flats")).toBeNull();
    expect(resolveCity("kanoland estates")).toBeNull();
    expect(resolveCity("hotels in Taraba")?.state).toBe("Taraba");
    expect(resolveCity("asaba")?.state).toBe("Delta");
  });

  it("prefers the longer name when two overlap", () => {
    expect(resolveCity("shortlets in Cross River")?.state).toBe("Cross River");
    expect(resolveCity("akwa ibom guest house")?.state).toBe("Akwa Ibom");
  });
});
