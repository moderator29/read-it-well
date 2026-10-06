import { LiveNotifications, type NotificationItem } from "@/app/(app)/notifications/LiveNotifications";
import { PERSON } from "../../_fixtures/people";

/**
 * The inbox with fixture rows. The route reads the caller's own rows under
 * RLS; this renders the same client component with invented, brand-neutral
 * rows so the look can be screenshotted here. The realtime hook subscribes
 * with the fixture id and hears nothing, which is fine for a look.
 */
const NOW = Date.now();
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const ROWS: NotificationItem[] = [
  {
    id: "n1",
    kind: "booking",
    title: "Inspection confirmed for Saturday",
    body: "Luxury 4 Bedroom with BQ, Lekki Phase 1. The agent will meet you at the gate at 11:00.",
    href: "/inspections",
    read: false,
    createdAt: ago(12),
  },
  {
    id: "n2",
    kind: "message",
    title: "Tunde Adebayo replied",
    body: "Yes, the generator is included in the service charge.",
    href: "/messages",
    read: false,
    createdAt: ago(48),
  },
  {
    id: "n3",
    kind: "wallet",
    title: "Your payment went through",
    body: "The receipt is in your payments.",
    href: "/payments",
    read: true,
    createdAt: ago(60 * 5),
  },
  {
    id: "n4",
    kind: "social",
    title: "Chioma Okafor started following you",
    body: null,
    href: `/u/${PERSON.handle}`,
    read: true,
    createdAt: ago(60 * 26),
  },
  {
    id: "n5",
    kind: "listing",
    title: "Your listing is live",
    body: "Penthouse with terrace is published and visible in search.",
    href: "/agent",
    read: true,
    createdAt: ago(60 * 30),
  },
];

export default function PreviewNotifications() {
  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        <div className="mx-auto max-w-2xl">
          <LiveNotifications initial={ROWS} userId={PERSON.id} />
        </div>
      </div>
    </main>
  );
}
