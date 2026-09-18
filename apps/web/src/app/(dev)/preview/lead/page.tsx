import Link from "next/link";

const PAGES = ["drawer", "dock", "flip"];

export default function LeadPreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Lead previews</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((p) => (
          <li key={p}>
            <Link className="nf-link" href={`/preview/lead/${p}`}>
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
