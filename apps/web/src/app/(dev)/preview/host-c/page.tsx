import Link from "next/link";

/* The host build team's deck for C1, C3, C4 and C9 (30 September 2026). */
const PAGES = ["calendar", "decide", "reviews", "statement"];

export default function PreviewHostCIndex() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="nf-h2">Preview: host C</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((p) => (
          <li key={p}>
            <Link className="nf-link" href={`/preview/host-c/${p}`}>
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
