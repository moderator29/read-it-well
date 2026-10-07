import Link from "next/link";
import type { StayDetails } from "@/lib/bookings/stay-details";

/**
 * D75: the trip page's "getting there" panel. Presentation is deliberately
 * plain (the stays restyle owns the look); what it shows is the database's
 * decision in `my_stay_details`: the address and the way in only once the
 * stay is paid, and a line saying so before.
 */
export function StayDetailsPanel({ details }: { details: StayDetails }) {
  if (details.state === "unpaid") {
    return (
      <section className="nf-panel nf-panel--card mt-lg p-card" data-testid="stay-details-unpaid">
        <h2 className="nf-overline mb-sm text-[var(--nf-content-muted)]">Getting there</h2>
        <p className="nf-body-sm text-[var(--nf-content-muted)]">
          The address, check-in details and a way to reach your host appear here once the stay is paid.
        </p>
      </section>
    );
  }
  if (details.state !== "ready") return null;

  const rows: [string, string][] = [];
  if (details.address) rows.push(["Address", details.areaCity ? `${details.address}, ${details.areaCity}` : details.address]);
  if (details.checkInFrom) rows.push(["Check-in from", details.checkInFrom]);
  if (details.checkOutBy) rows.push(["Check-out by", details.checkOutBy]);
  if (details.estateName) rows.push(["Estate", details.estateName]);
  if (details.gateDirections) rows.push(["At the gate", details.gateDirections]);
  if (details.securityPhone) rows.push(["Security", details.securityPhone]);
  if (details.accessCode) rows.push(["Access code", details.accessCode]);
  if (details.houseRules) rows.push(["House rules", details.houseRules]);

  return (
    <section className="nf-panel nf-panel--card mt-lg p-card" data-testid="stay-details">
      <h2 className="nf-overline mb-sm text-[var(--nf-content-muted)]">Getting there</h2>
      {rows.length > 0 ? (
        <dl className="grid gap-row">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-inline">
              <dt className="nf-caption text-[var(--nf-content-muted)]">{label}</dt>
              <dd className="nf-body-sm text-[var(--nf-content-primary)]">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="nf-body-sm text-[var(--nf-content-muted)]">Your host has not added arrival details yet. Message them for directions.</p>
      )}
      <Link href={details.messageHref} className="nf-btn nf-btn--secondary nf-btn--sm mt-block" data-testid="stay-message-host">
        {details.hostName ? `Message ${details.hostName}` : details.kind === "room" ? "Message the hotel" : "Message your host"}
      </Link>
    </section>
  );
}
