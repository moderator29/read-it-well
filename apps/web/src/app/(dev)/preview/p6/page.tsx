import Link from "next/link";

/**
 * P6's index (7 October 2026): account, inbox, plans, admin and Pro. Each
 * page mounts the real components with honest sample props, because there is
 * no signed-in test account and the staff console's guard is never bypassed.
 */
const PAGES: [string, string][] = [
  ["pro", "Pro: Free (every member today)"],
  ["pro?s=signed-out", "Pro: signed out"],
  ["pro?s=unknown", "Pro: the plan could not be read"],
  ["pro?s=held", "Pro: a plan held (no member has one yet)"],
  ["notifications", "Notifications: Needs you as a stack in depth"],
  ["notifications?empty=1", "Notifications: all caught up"],
  ["settings-notifications", "Notification settings: the matrix and quiet hours"],
  ["tracker", "The one tracker: a rental in review, a stay confirmed"],
];

export default function PreviewP6() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">P6: account, inbox, plans, admin and Pro</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/p6/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
