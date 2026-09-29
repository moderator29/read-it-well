import Link from "next/link";

const PAGES = [
  ["thread-booking", "The stay face: a booking thread with the card"],
  ["thread-booking-context", "A stay thread with no card: the context row"],
  ["thread-rental", "The property face: the listing header, role tags and the photo bundle"],
  ["share-picker", "Sending a property into somebody's chat"],
  ["inbox", "The inbox"],
  ["inspection", "An inspection"],
  ["admin-queue", "The admin queue"],
  ["admin-frame", "The console frame every desk inherits"],
  ["admin-desks", "The desks that carry their own body"],
  ["agent-dashboard", "The agent dashboard"],
  ["agent-listings", "The agent's properties"],
  ["agent-bookings", "The agent's bookings board"],
  ["agent-messages", "The agent's enquiries"],
  ["agent-inspections", "The agent's inspections"],
  ["agent-reviews", "The agent's reviews"],
  ["agent-earnings", "The agent's earnings"],
  ["agent-analytics", "The agent's analytics"],
  ["agent-verification", "Where an agent stands on the ladder"],
  ["agent-settings", "The agent's own settings"],
  ["host-landing", "Where a host stands"],
  ["host-wizard", "The host wizard, step one"],
  ["agent-assistant", "The assistant inside the listings workspace"],
  ["host-assistant", "The assistant inside the host workspace"],
  ["host-settings", "The host workspace's own settings"],
];

export default function PreviewF5() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">F5 surfaces</h1>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, label]) => (
          <li key={slug}>
            <Link className="nf-link-quiet text-[var(--nf-content-link)]" href={`/preview/f5/${slug}`}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
