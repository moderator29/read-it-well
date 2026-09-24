import Link from "next/link";

/**
 * The index of the platform sweep's harness for the home group (worker
 * "sweep-home"): home on both sides, search and its filter sheet, listing
 * detail and the price check. Every page renders the real screen components
 * inside the real shell; most take fixture rows, and the two marked "the
 * route's own page" mount the route itself, which on this box reads nothing
 * and so draws its empty state. `lib/nav/route-files.test.ts` needs a parent
 * served here.
 */

const PAGES: readonly (readonly [string, string])[] = [
  ["home", "Home, property side, signed in (fixture rows)"],
  ["home-empty", "Home, the route's own page: the empty shelf"],
  ["stays", "Stays home: hero, the four doors, featured stays (fixture cards)"],
  ["search", "Search results (fixture rows); add ?filters=open for the filter sheet"],
  ["search-empty", "Search, the route's own page: no results; add ?view=map for the map"],
  ["listing", "Listing detail on a tenancy (fixture)"],
  ["listing-parts", "Every other listing panel: sale costs, reviews, reserve, table slots"],
  ["loading", "Loading skeletons: ?of=search or ?of=listing"],
  ["price", "Price check, before a pin is dropped"],
  ["price-area", "Price check: the area report and facts panel"],
  ["price-answered", "Price check: an answered range"],
  ["assistant", "The assistant: bubbles, result cards, chips, composer"],
  ["move-in", "The move-in ledger (Calculate Breakdown), fixture rental"],
  ["price-share", "The shared area card, as /price/area/[id] draws it (fixture share)"],
];

export default function SweepHomeIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Platform sweep: home group</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link
              className="nf-link-quiet text-[var(--nf-content-link)]"
              href={`/preview/session-b/sweep-home/${slug}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
