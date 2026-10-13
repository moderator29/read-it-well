import Link from "next/link";

const PAGES = [
  ["blocked", "Blocked accounts, with people on the list"],
  ["blocked?v=empty", "Blocked accounts, nobody blocked"],
];

export default function PreviewDb2() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">DB2 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet nf-tap text-[var(--nf-content-link)]" href={`/preview/db2/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
