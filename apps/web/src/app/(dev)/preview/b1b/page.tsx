import Link from "next/link";

/*
 * THE DECK INDEX THAT DID NOT EXIST.
 *
 * Every screen under `/preview/{slug}/...` declares `/preview/{slug}` as its
 * parent, and until today nothing was served there. On this deployment an
 * unknown path answers HTTP 200 with the site shell rather than a 404, so the
 * back control on every screen in this deck led somewhere that looked like a
 * page and was not one. A guard in `lib/nav/route-files.test.ts` now fails the
 * moment a preview deck is created without one of these.
 */

const PAGES = [
  "chooser",
  "owner",
  "owner-done",
  "agent",
  "agent-done",
  "firm",
  "firm-done",
];

export default function PreviewB1bIndex() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="nf-h2">Preview: B1B</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((p) => (
          <li key={p}>
            <Link className="nf-link" href={`/preview/b1b/${p}`}>
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
