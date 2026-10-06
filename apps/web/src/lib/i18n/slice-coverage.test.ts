import { describe, expect, it } from "vitest";
import { NARROW, SLICES } from "./slice";
import { reachableNamespaces, reachableSubKeys } from "./reachable-namespaces";

/*
 * THE SLICES MUST COVER EVERYTHING THEIR COMPONENT CAN REACH.
 *
 * A client component hands its `t` to helpers and children that read it under
 * other names (`dictionary.units`, `copy.catalogue`), so reading the
 * component's own file is not enough: the listing card reached `units` through
 * a helper and a smoke run caught it where this test, as first written, did
 * not. So this walks the component's WHOLE local import graph and counts any
 * `.name` or `["name"]` that is a top-level dictionary namespace, anywhere in
 * it. That over-approximates on purpose: a slice that carries one namespace
 * too many costs a few kilobytes, one that carries one too few is a crash.
 */
const ROOTS: Record<keyof typeof SLICES, string> = {
  listingCard: "components/app/ListingCard.tsx",
  stayCard: "components/app/stays/StayCard.tsx",
  stayFilterSheet: "components/app/stays/StayFilterSheet.tsx",
  priceCheck: "components/app/price/PriceCheckScreen.tsx",
  proofStrip: "components/app/listing/ProofStrip.tsx",
  settingsHub: "app/(app)/settings/SettingsHub.tsx",
};

describe("every dictionary slice carries what its component can reach", () => {
  for (const [name, root] of Object.entries(ROOTS)) {
    it(name, () => {
      const carried = new Set<string>(SLICES[name as keyof typeof SLICES] as readonly string[]);
      const missing = [...reachableNamespaces(root)].filter((ns) => !carried.has(ns)).sort();
      expect(missing, `${name} slice is missing namespaces its import graph reads`).toEqual([]);
    });
  }
});

/*
 * THE NARROWED NAMESPACES MUST COVER EVERY KEY THEIR GRAPH READS, AND NOTHING
 * MAY READ THEM WHOLE. `unit-shape.ts` is the one false positive: it reads
 * `unit.shape`, the unit's own field, which is not a dictionary at all.
 */
describe("narrowed namespaces carry every key their component can reach", () => {
  for (const [name, narrow] of Object.entries(NARROW)) {
    for (const [namespace, carried] of Object.entries(narrow)) {
      it(`${name}.${namespace}`, () => {
        const { keys, whole } = reachableSubKeys(ROOTS[name as keyof typeof ROOTS], namespace);
        const missing = [...keys].filter((key) => !(carried as readonly string[]).includes(key)).sort();
        expect(missing, `${name} narrows ${namespace} but its graph reads these keys`).toEqual([]);
        const wholeReads = whole.filter((line) => !line.startsWith("lib/listings/unit-shape.ts"));
        expect(wholeReads, `${name} reads ${namespace} as a whole, so it cannot be narrowed`).toEqual([]);
      });
    }
  }
});
