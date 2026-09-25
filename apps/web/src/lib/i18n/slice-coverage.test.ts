import { describe, expect, it } from "vitest";
import { SLICES } from "./slice";
import { reachableNamespaces } from "./reachable-namespaces";

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
