import Link from "next/link";

const PAGES = [
  ["thread-booking", "A booking thread with the card"],
  ["thread-rental", "A rental thread, role tags and the photo bundle"],
  ["inbox", "The inbox"],
  ["inspection", "An inspection"],
  ["admin-queue", "The admin queue"],
  ["agent-dashboard", "The agent dashboard"],
  ["host-wizard", "The host wizard, step one"],
];

export default function PreviewF5() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F5 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/f5/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
