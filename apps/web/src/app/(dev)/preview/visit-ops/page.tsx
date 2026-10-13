import Link from "next/link";

const PAGES = [
  ["lister", "The lister's visit calendar (/agent/inspections); ?empty=1 for no visits"],
  ["admin", "Bookings > Visits on the console frame; ?view=month, ?visit=<id>, ?state=done, ?empty=1"],
];

/** Visit ops' harness: the two visit calendars, from fixtures on a pinned Tuesday. */
export default function PreviewVisitOpsIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Visit ops</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, note]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/visit-ops/${slug}`}>
              {slug}
            </Link>
            <span className="ml-inline text-[var(--nf-content-muted)]">{note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
