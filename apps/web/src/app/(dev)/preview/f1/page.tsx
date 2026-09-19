import Link from "next/link";

/**
 * F1's index.
 *
 * It used to list four slugs - welcome, home, notifications, assistant - and
 * not one of them had a route, so every link on this page was a 404. Three of
 * the four were not F1's surfaces either: home and the assistant belong to F4
 * and the welcome screen has a real address of its own at `/welcome`, which
 * needs no harness because a guest can reach it. What F1 cannot photograph
 * without a harness is the SIGNED-IN chrome: the drawer only exists while a
 * state flag is true, and the header's bell and avatar only exist for
 * somebody with an account.
 */
const PAGES: [string, string][] = [
  ["chrome", "The app header and the five-slot dock, Property side"],
  ["drawer", "The side drawer open, with the flip coin at its foot"],
  ["dock-stays", "The dock after a flip: Stays in the first slot"],
];

export default function PreviewF1() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F1: chrome and navigation</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/f1/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="nf-body-sm mt-md text-[var(--nf-content-secondary)]">
        The auth family and first run are real addresses: /sign-in, /sign-up, /welcome.
      </p>
    </main>
  );
}
