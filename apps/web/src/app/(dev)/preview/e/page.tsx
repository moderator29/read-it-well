import Link from "next/link";

const PAGES = [
  "wallet",
  "wallet-topup",
  "send",
  "receive",
  "transactions",
  "receipt",
  "result?state=pending",
  "result?state=sent",
  "result?state=received",
  "result?state=failed",
  "payments",
];

export default function PreviewEIndex() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="nf-h2">Preview: E</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map((p) => (
          <li key={p}>
            <Link className="nf-link" href={`/preview/e/${p}`}>
              {p}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
