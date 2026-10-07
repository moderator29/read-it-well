import Link from "next/link";
import { getDictionary } from "@vallo/i18n";
import { comparedFully, matchSummary } from "@/lib/photo-hash/dhash";
import type { PhotoProvenance as Provenance } from "@/lib/photo-hash/matches-read";
import { Panel } from "../../_review/parts";
import { PhotoBackfillButton } from "./PhotoBackfillButton";

/**
 * V-45 ON THE REVIEW DESK: which of this listing's photographs look like
 * photographs on another lister's listing, or on one Vallo rejected. A
 * resemblance for a person to look at, never a decision: a stock photo, two
 * agents of one firm and a relisted flat all match too, and the panel says
 * so. The desk reads English.
 *
 * IT SAYS HOW MUCH WAS COMPARED. "None of these look like another" is printed
 * only when every photograph here was hashed and there were hashed
 * photographs elsewhere to compare against. Otherwise the panel says how many
 * of how many were compared, against how many, and offers the backfill.
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
  const { coverage } = provenance;
  const summary = matchSummary(provenance.matches, coverage.photos);
  const full = comparedFully(coverage);
  return (
    <Panel title={DESK.photosTitle}>
      <p className="nf-rv-msg" data-testid="photo-coverage">
        {DESK.photosCoverage
          .replace("{hashed}", String(coverage.hashed))
          .replace("{photos}", String(coverage.photos))
          .replace("{pool}", String(coverage.pool))}
      </p>
      <p className="nf-rv-msg mt-2xs" data-testid="photo-provenance">
        {summary.matched > 0
          ? DESK.photosSome.replace("{matched}", String(summary.matched)).replace("{total}", String(coverage.photos))
          : full
            ? DESK.photosNone.replace("{total}", String(coverage.photos))
            : DESK.photosPartial}
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
      {coverage.poolWaiting > 0 && (
        <div className="mt-xs grid gap-2xs">
          <p className="nf-rv-msg">{DESK.photosWaiting.replace("{count}", String(coverage.poolWaiting))}</p>
          <PhotoBackfillButton
            copy={{ backfill: DESK.photosBackfill, backfilling: DESK.photosBackfilling, backfilled: DESK.photosBackfilled }}
          />
        </div>
      )}
    </Panel>
  );
}
