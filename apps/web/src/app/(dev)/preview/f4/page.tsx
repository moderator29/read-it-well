import Link from "next/link";

const PAGES = [
  "feed",
  "feed-bloom",
  "post-thread",
  "story",
  "story-new",
  "place",
  "profile",
  "public-profile",
  "edit-profile",
  "notifications",
  "settings",
  "assistant",
  "thread-empty",
];

export default function F4PreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F4: social and identity</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((page) => (
          <li key={page}>
            <Link className="nf-link" href={`/preview/f4/${page}`}>
              {page}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
