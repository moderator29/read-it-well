import Link from "next/link";

/**
 * The index every page under `sweep-home` already declared as its parent.
 *
 * WHY IT EXISTS AND WHO ADDED IT. `lib/nav/route-files.test.ts` asserts that
 * every page route resolves to a parent the application actually serves.
 * Eleven pages here named `/preview/session-b/sweep-home` as theirs and nothing
 * was served at it, so that test failed on `main` and took the whole suite with
 * it. This file is additive - no page in this directory is touched - and was
 * written by the session working on the trust badge, not the one that owns this
 * harness, because ledger 49bis puts a red `main` above the scope split. If the
 * labels below read thinly, that is why: they are taken from each route's own
 * name, and the session that built these screens should say what they are for.
 */

const PAGES: readonly (readonly [string, string])[] = [
  ["home", "The home screen"],
  ["home-empty", "The home screen with nothing in it"],
  ["listing", "A listing"],
  ["listing-parts", "A listing, broken into its parts"],
  ["loading", "The loading state"],
  ["price", "The price"],
  ["price-answered", "The price, once it has been answered"],
  ["price-area", "The price for an area"],
  ["search", "Search"],
  ["search-empty", "Search with no results"],
  ["stays", "Stays"],
];

export default function SweepHomeIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Home sweep</h1>
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
