import Link from "next/link";

/**
 * The index every page under `sweep-wallet` already declared as its parent.
 *
 * THE SECOND TIME TODAY, WHICH IS WHY THIS NOTE IS HERE RATHER THAN JUST THE
 * FILE. `lib/nav/route-files.test.ts` asserts that every page route resolves to
 * a parent the application actually serves. `sweep-home` shipped eleven pages
 * with no index and turned `main` red; that was fixed, and half an hour later
 * `sweep-wallet` shipped eight more with the same gap. A preview harness needs
 * an index page at its root, or the whole suite fails for everyone.
 *
 * Additive: no page in this directory is touched. Written by the session
 * working on the trust badge rather than the one that owns this harness,
 * because ledger 49bis puts a red `main` above the scope split. The labels come
 * from each route's own slug and should be replaced with what the screens are
 * actually for.
 */

const PAGES: readonly (readonly [string, string])[] = [
  ["payments", "Payments"],
  ["pots", "Pots"],
  ["receipt", "A receipt"],
  ["receive", "Receiving money"],
  ["result", "The result of a transfer"],
  ["topup", "Topping up"],
  ["transactions", "Transactions"],
  ["withdraw", "Withdrawing"],
];

export default function SweepWalletIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Wallet sweep</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link
              className="nf-link-quiet text-[var(--nf-content-link)]"
              href={`/preview/session-b/sweep-wallet/${slug}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
