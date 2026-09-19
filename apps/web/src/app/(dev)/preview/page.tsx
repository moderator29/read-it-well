import Link from "next/link";

const GROUPS = ["lead", "f1", "f2", "f3", "f4", "f5", "e", "o3", "p3"];

export default function PreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Preview harness</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {GROUPS.map((g) => (
          <li key={g}>
            <Link className="nf-link" href={`/preview/${g}`}>
              {g}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
