import Link from "next/link";

import { SESSION_B_DECKS } from "./decks";

/**
 * The index of the `session-b` preview namespace.
 *
 * Every deck under here declares `/preview/session-b` as an ancestor, and a
 * directory with screens and no `page.tsx` answered with the site shell rather
 * than a 404, which looked like a page and led nowhere. With this file the
 * namespace has no exception in `lib/nav/route-files.test.ts`: every preview
 * directory that holds a screen serves its own index.
 *
 * The list (`./decks.ts`) is written down rather than read off disk because
 * the harness renders on a server that may not ship its own source tree; the
 * route-files test checks that every deck directory is named in it.
 */

export default function PreviewSessionBIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Preview decks</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {SESSION_B_DECKS.map(([slug, note]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/session-b/${slug}`}>
              {slug}
            </Link>
            <span className="ml-inline text-[var(--nf-content-muted)]">{note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
