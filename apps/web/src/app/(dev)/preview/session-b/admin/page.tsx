// The index of this harness directory, so every harness directory has its own page.tsx at its root (route-files test).
import Link from "next/link";

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-md">
      <h1 className="mb-sm text-[length:var(--nf-text-h3)] font-semibold">Admin console harness</h1>
      <ul className="grid gap-xs">
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/overview">Overview</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/overview?state=live">Overview, empty</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/operations">Operations</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/operations?tab=inflight">Operations, In flight</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/operations?tab=notifications">Operations, Notifications</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/analytics">Analytics</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/analytics?state=live">Analytics, empty</Link></li>
      <li><Link className="text-[var(--nf-content-link)] underline" href="/preview/session-b/admin/back">Back arrow as /admin/money</Link></li>
      </ul>
    </main>
  );
}
