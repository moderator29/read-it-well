import type { Listing } from "@/lib/listings/types";

/**
 * The three Track G lister states laid over fixture rows, so the card's
 * lister line (C3.3) is photographed in all three: an agent with a name, the
 * owner (the sentence names nobody), a firm with a name. Invented names on a
 * fixture harness only; the product reads `public.listing_lister`.
 */
export function withListers(rows: Listing[]): Listing[] {
  const states: Pick<Listing, "listerRole" | "listerName">[] = [
    { listerRole: "agent", listerName: "Emeka Johnson" },
    { listerRole: "owner" },
    { listerRole: "firm", listerName: "Acme Properties Ltd" },
  ];
  return rows.map((row, i) => ({ ...row, ...states[i % states.length] }));
}
