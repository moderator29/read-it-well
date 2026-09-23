import Link from "next/link";

const ROUTES = [
  ["stays", "/stays"],
  ["stays-search", "/stays/search (add ?filters=open for the sheet)"],
  ["stay", "/stay/[id]"],
  ["trips", "/trips"],
  ["restaurants", "/restaurants"],
  ["restaurant", "/restaurant/[id]"],
  ["checkout", "/checkout/[bookingId]"],
  ["pay-pending", "/checkout/[bookingId] payment pending sheet"],
  ["pay-failed", "/checkout/[bookingId] payment failed sheet"],
  ["escrow", "/escrow"],
  ["escrow-detail", "/escrow/[id]"],
  ["escrow-thread", "the held payment in a conversation"],
] as const;

/** The index of the stays group's sweep harness. */
export default function SweepStaysIndex() {
  return (
    <ul className="grid gap-xs">
      {ROUTES.map(([slug, route]) => (
        <li key={slug}>
          <Link href={`/preview/session-b/sweep-stays/${slug}`}>{route}</Link>
        </li>
      ))}
    </ul>
  );
}
