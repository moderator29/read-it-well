import Link from "next/link";

const PAGES = [
  ["welcome", "First run, the two worlds"],
  ["home", "The in-app home"],
  ["notifications", "The inbox"],
  ["assistant", "The assistant, mid-conversation"],
];

export default function PreviewF1() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F1 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/f1/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
