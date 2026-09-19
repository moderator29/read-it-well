import Link from "next/link";

const PAGES = [
  "search",
  "search?filters=open",
  "listing",
  "move-in",
  "stays",
  "stays-search",
  "stays-search?filters=open",
  "stay",
  "trips",
  "bookings",
  "checkout",
  "saved",
  "restaurants",
];

export default function F3PreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F3 preview</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((page) => (
          <li key={page}>
            <Link className="nf-link" href={`/preview/f3/${page}`}>
              {page}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
