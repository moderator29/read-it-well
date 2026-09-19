import Link from "next/link";

const PAGES = [
  ["agent-calendar", "A listing calendar with nothing closed and nothing booked"],
  ["styleguide-buttons", "The button specimens, which are pressable"],
];

/** O3's harness: the two surfaces changed in the audit-gate stint. */
export default function PreviewO3Index() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">O3</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, note]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/o3/${slug}`}>
              {slug}
            </Link>
            <span className="ml-inline text-[var(--nf-content-muted)]">{note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
