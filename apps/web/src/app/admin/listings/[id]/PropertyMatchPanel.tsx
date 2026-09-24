import type { Dictionary, Locale } from "@vallo/i18n";
import { formatMoney } from "@vallo/i18n";
import { readListingPropertyId, readPropertyCandidates } from "@/lib/landlord/queries";
import { Badge, Empty, Panel } from "../../_review/parts";
import { PropertyMatchButtons, PropertySplitButton } from "./PropertyMatchButtons";

type AdminCopy = Dictionary["landlord"]["admin"];

/**
 * V-37. "SAME PROPERTY?" ON THE REVIEW PAGE, PROPOSED AND NEVER DECIDED FOR YOU.
 *
 * The four-agent duplicate is four listings naming one landlord. At review the
 * database proposes the listings that may be this same flat, on two signals,
 * either of which is enough to propose and neither of which decides:
 *
 *   the same owner on record   the HMAC of the principal's number matches.
 *                              The reviewer is told "same owner on record",
 *                              never the owner and never the number.
 *   the pins                   within 40 metres,
 *
 * and always with the same bedrooms and type. When both listings carry an
 * approved principal and the two differ, the row says "Different owner on
 * record", because a pin alone is not a flat. One tap joins them on a
 * property (the renter then sees one page with every offer side by side), or
 * records them as different so the pair is never proposed again.
 *
 * Staff only, checked inside `property_candidates` rather than by a grant.
 */
export async function PropertyMatchPanel({
  listingId,
  copy,
  locale,
}: {
  listingId: string;
  copy: AdminCopy;
  locale: Locale;
}) {
  const [candidates, propertyId] = await Promise.all([
    readPropertyCandidates(listingId),
    readListingPropertyId(listingId),
  ]);

  return (
    <Panel title={copy.matchTitle} note={copy.matchLede}>
      {propertyId && (
        <div className="mb-sm grid gap-xs" data-testid="property-joined">
          <p className="nf-rv-msg">{copy.onProperty}</p>
          <PropertySplitButton listingId={listingId} label={copy.split} />
        </div>
      )}
      {candidates === null ? (
        <Empty kind="error" title={copy.matchTitle} body={copy.matchFailed} />
      ) : candidates.length === 0 ? (
        <p className="nf-rv-msg" data-testid="property-match-none">
          {copy.matchNone}
        </p>
      ) : (
        <ul className="grid gap-sm" data-testid="property-match-list">
          {candidates.map((candidate) => (
            <li key={candidate.listingId} className="grid gap-xs border-t border-[var(--nf-border-subtle)] pt-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-sm">
                <span className="nf-rv-ref">{candidate.reference ?? candidate.title}</span>
                <span className="nf-rv-table__muted">
                  {candidate.listerName ?? ""}
                  {candidate.moveInMinor !== null ? ` · ${formatMoney(candidate.moveInMinor, locale)}` : ""}
                </span>
              </div>
              <div className="flex flex-wrap gap-xs">
                {candidate.samePrincipal && <Badge tone="info">{copy.signalPrincipal}</Badge>}
                {candidate.differentPrincipal && <Badge tone="warning">{copy.signalDifferent}</Badge>}
                {candidate.distanceM !== null && candidate.distanceM <= 40 && (
                  <Badge tone="info">{copy.signalNear.replace("{m}", String(candidate.distanceM))}</Badge>
                )}
              </div>
              <PropertyMatchButtons
                listingId={listingId}
                otherId={candidate.listingId}
                labels={{ join: copy.join, apart: copy.apart }}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
