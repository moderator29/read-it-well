import Link from "next/link";
import { formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { fixText } from "@/lib/agent/funnel";
import type { FunnelBoard } from "@/lib/agent/funnel-queries";

/**
 * Each published listing's last seven days, stage by stage, beside the
 * median for similar listings, with one fix under it (V-73).
 *
 * Three states and each says what it is: unavailable (the counting is not
 * running, so the page falls back to saying views are not counted), no
 * published listings (nothing can be seen that is not live), and the board.
 * A median that cannot be taken honestly (fewer than three similar listings)
 * reads as a dash with the reason once under the table, never as a zero.
 */
export function ListingFunnels({
  board,
  copy,
  locale,
}: {
  board: FunnelBoard;
  copy: Dictionary["shape"]["funnel"];
  locale: Locale;
}) {
  if (board.state === "unavailable") return null;
  if (board.listings.length === 0) {
    return <p className="nf-caption text-[var(--nf-content-secondary)]">{copy.empty}</p>;
  }
  return (
    <div className="flex flex-col gap-md" data-testid="listing-funnels">
      {board.listings.map((listing) => {
        const noMedian = listing.funnel.rows.every((row) => row.median === null);
        return (
          <article key={listing.id} className="nf-panel nf-panel--card block p-md">
            <Link
              href={`/agent/list?id=${listing.id}`}
              className="text-[length:var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]"
            >
              {listing.title}
            </Link>
            <table className="mt-sm w-full text-[length:var(--nf-text-caption)]">
              <thead>
                <tr className="text-left text-[var(--nf-content-muted)]">
                  <th scope="col" className="py-2xs font-medium">{copy.stage}</th>
                  <th scope="col" className="py-2xs text-right font-medium">{copy.yours}</th>
                  <th scope="col" className="py-2xs text-right font-medium">{copy.similar}</th>
                </tr>
              </thead>
              <tbody>
                {listing.funnel.rows.map((row) => (
                  <tr key={row.stage} className="border-t border-[var(--nf-panel-hair)]">
                    <th scope="row" className="py-2xs text-left font-normal text-[var(--nf-content-secondary)]">
                      {copy.stages[row.stage]}
                    </th>
                    <td className="nf-numeric py-2xs text-right font-semibold">{formatNumber(row.mine, locale)}</td>
                    <td className="nf-numeric py-2xs text-right text-[var(--nf-content-secondary)]">
                      {row.median === null ? copy.tooFew : formatNumber(Math.round(row.median), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {noMedian && (
              <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{copy.noMedian}</p>
            )}
            {listing.fix && (
              <p className="nf-body-sm mt-sm text-[var(--nf-content-primary)]" data-testid="funnel-fix">
                <strong>{copy.fixLabel}</strong> {fixText(copy.fixes[listing.fix.key], listing.fix.values)}
              </p>
            )}
          </article>
        );
      })}
      <p className="nf-caption text-[var(--nf-content-muted)]">{copy.howCounted}</p>
    </div>
  );
}
