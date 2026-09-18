import Link from "next/link";

const PAGES = [
  ["error", "The root error boundary, with a reference"],
  ["app-error", "The in-app error boundary (no chrome here; the real one sits under the header)"],
  ["not-found", "The missing page, with the search"],
  ["loading", "The root wait"],
  ["legal", "The in-app legal reader (terms), without the shell"],
];

export default function PreviewG4() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">G4 surfaces</h1>
      <p className="mt-xs text-[var(--nf-content-secondary)]">
        The offline screen is a real public route: <Link className="nf-link-quiet text-[var(--nf-content-link)]" href="/offline">/offline</Link>.
      </p>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/g4/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
