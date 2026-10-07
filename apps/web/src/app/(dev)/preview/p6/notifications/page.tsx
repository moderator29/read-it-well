import { LiveNotifications, type NotificationItem } from "@/app/(app)/notifications/LiveNotifications";
import { PERSON } from "../../_fixtures/people";

/**
 * The notifications inbox with three things waiting on the person, so the
 * "Needs you" depth stack (reference 1) has depth to show (P6). Invented,
 * brand-neutral rows; the realtime hook subscribes with the fixture id and
 * hears nothing. `?empty=1` draws the all-caught-up state.
 */
const NOW = Date.parse("2026-10-07T11:00:00.000Z");
const ago = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

const ROWS: NotificationItem[] = [
  {
    id: "p1",
    kind: "message",
    title: "Tunde Adebayo replied",
    body: "Yes, the generator is included in the service charge.",
    href: "/messages/c-tunde",
    read: false,
    createdAt: ago(6),
  },
  {
    id: "p2",
    kind: "booking",
    title: "New booking request",
    body: "Two nights at the Lekki studio, 18 to 20 October.",
    href: "/host/bookings",
    read: false,
    createdAt: ago(34),
  },
  {
    id: "p3",
    kind: "message",
    title: "Chioma Okafor sent a message",
    body: "Is the flat still available for an inspection on Saturday?",
    href: "/messages/c-chioma",
    read: false,
    createdAt: ago(80),
  },
  {
    id: "p4",
    kind: "booking",
    title: "Inspection confirmed for Saturday",
    body: "The agent will meet you at the gate at 11:00.",
    href: "/inspections",
    read: false,
    createdAt: ago(140),
  },
  {
    id: "p5",
    kind: "wallet",
    title: "Your payment went through",
    body: "The receipt is in your payments.",
    href: "/payments",
    read: true,
    createdAt: ago(60 * 20),
  },
  {
    id: "p6",
    kind: "listing",
    title: "Your listing is live",
    body: "Penthouse with terrace is published and visible in search.",
    href: "/agent",
    read: true,
    createdAt: ago(60 * 30),
  },
];

export default async function PreviewP6Notifications({ searchParams }: { searchParams: Promise<{ empty?: string }> }) {
  const { empty } = await searchParams;
  return (
    <main id="main" className="min-h-dvh pb-4xl">
      <div className="nf-shell py-section-tight">
        <div className="mx-auto max-w-2xl">
          <LiveNotifications
            initial={empty ? [] : ROWS}
            userId={PERSON.id}
            openThreads={["c-tunde", "c-chioma"]}
            now={NOW}
          />
        </div>
      </div>
    </main>
  );
}
