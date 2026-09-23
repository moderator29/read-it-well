// The index of this harness directory, so every harness directory has its own page.tsx at its root (route-files test).
import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-md">
      <h1 className="mb-sm text-[length:var(--nf-text-h3)] font-semibold">Review desks harness</h1>
      <ul className="grid gap-xs">
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin-review/listings">Listings</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin-review/review">Listing under review</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin-review/moderation">Moderation</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin-review/kyc">Verification</Link></li>
      </ul>
    </main>
  );
}
