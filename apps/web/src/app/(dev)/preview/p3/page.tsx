import Link from "next/link";

const PAGES = [
  ["admin-businesses", "The host applications desk, with the shelf gate"],
  ["host-reservations", "The venue's own table board"],
  ["host-reservations-empty", "The table board on the day a venue signs"],
  ["host-photos", "The owner's photographs of their venue"],
];

export default function PreviewP3() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">P3 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/p3/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
