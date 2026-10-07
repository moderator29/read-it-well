import Link from "next/link";

/* The p5 deck's own index: every screen under it names this as its parent
   (route-files.test.ts), and the receipt's back link lands here. */
const PAGES = ["gate", "invite", "payments", "payouts", "receipt", "receipts", "refunds", "waiting", "wallet"];

export default function P5PreviewIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">P5 previews</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((p) => (
          <li key={p}>
            <Link className="nf-link" href={`/preview/p5/${p}`}>
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
