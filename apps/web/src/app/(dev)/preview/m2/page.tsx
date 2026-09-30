import Link from "next/link";

/**
 * Build team M2's decks (recommendations B5 to B17): real components with
 * fixture props, so each state can be seen without a session.
 */
const PAGES = [
  ["scam", "B12: the scam shield under a received message"],
  ["ask", "B6: the renter's question chips on a first message"],
  ["agreement", "B9: what changed since you confirmed"],
  ["listing", "B7 and B8: the reply-time line and the Price Check door"],
  ["rent", "B10: the rent countdown"],
  ["day-kit", "B5: the viewing day kit"],
  ["split", "B17: the messages split and the keyboard cheat sheet (press ?)"],
];

export default function PreviewM2Index() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Member kit</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link href={`/preview/m2/${slug}`} className="nf-body underline underline-offset-4">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
