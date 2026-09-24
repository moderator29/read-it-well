import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { matchSummary } from "@/lib/photo-hash/dhash";
import type { PhotoProvenance as Provenance } from "@/lib/photo-hash/matches-read";
import { Panel } from "../../_review/parts";

/**
 * V-45 ON THE REVIEW DESK: which of this listing's photographs look like
 * photographs on another lister's listing, or on one Vallo rejected. A
 * resemblance for a person to look at, never a decision: a stock photo, two
 * agents of one firm and a relisted flat all match too, and the panel says
 * so. The desk reads English.
 */
const DESK = getDictionary("en").trustVisible.desk;

export function PhotoProvenance({ provenance, total }: { provenance: Provenance; total: number }) {
  if (total === 0) return null;
  if (provenance.state !== "ok") {
    return (
      <Panel title={DESK.photosTitle}>
        <p className="nf-rv-msg" role={provenance.state === "failed" ? "alert" : "note"}>
          {provenance.state === "failed" ? DESK.photosFailed : DESK.photosNotCompared}
        </p>
      </Panel>
    );
  }
  const summary = matchSummary(provenance.matches, total);
  return (
    <Panel title={DESK.photosTitle}>
      <p className="nf-rv-msg" data-testid="photo-provenance">
        {summary.matched === 0
          ? DESK.photosNone.replace("{total}", String(total))
          : DESK.photosSome.replace("{matched}", String(summary.matched)).replace("{total}", String(total))}
        {summary.onRejected > 0 ? ` ${DESK.photosRejected.replace("{count}", String(summary.onRejected))}` : ""}
      </p>
      {provenance.matches.length > 0 && (
        <ul className="mt-xs grid gap-2xs">
          {provenance.matches.map((m) => (
            <li key={`${m.photoId}-${m.matchListingId}`} className="nf-rv-msg">
              <Link href={`/admin/listings/${m.matchListingId}`} className="underline underline-offset-2">
                {(m.matchRejected ? DESK.photoLineRejected : DESK.photoLine)
                  .replace("{position}", String(m.photoPosition + 1))
                  .replace("{reference}", m.matchReference ?? DESK.photoNoReference)
                  .replace("{distance}", String(m.distance))}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
