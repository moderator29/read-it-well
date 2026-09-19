import Link from "next/link";

const PAGES = [["audit", "The audit desk on the console frame"]];

export default function PreviewBC() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">BC surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/bc/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
