import Link from "next/link";

/**
 * The index of the fixes bundle's proof pages (13 October 2026). Real
 * components with fixture props, so a surface that needs a signed-in session
 * or a provider's key can still be seen. Nothing here ships.
 */
const PAGES: [string, string][] = [
  ["filters", "The Filters sheet: the Shape tiles and the BQ row drawn with the realistic 3D objects"],
  ["providers", "The provider checks, with the Termii sender IDs and their status"],
];

export default function PreviewFixes() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">The fixes bundle</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/fixes/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
