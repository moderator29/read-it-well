import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { kindLine, type Flooding } from "@/lib/around/pulse";
import type { Neighbours } from "@/lib/around/pulse-queries";

/**
 * The lister's claim beside the neighbours' account (V-41).
 *
 * The flooding line is the lister's own answer, and unanswered says so rather
 * than reading as good news. Under it, what members living in the area have
 * reported, as counts, once five different members have answered a kind.
 * An area with no Around place, or with too few answers, says which; a
 * database without the migration renders nothing at all rather than a claim
 * about silence it cannot see.
 */
export function ListingNeighbours({
  neighbours,
  flooding,
  area,
  copy,
}: {
  neighbours: Neighbours;
  /** Undefined: not readable, so no lister line is drawn. */
  flooding: Flooding | null | undefined;
  area: string;
  copy: Dictionary["shape"]["neighbours"];
}) {
  if (neighbours.state === "unavailable" && flooding === undefined) return null;
  const areaName = neighbours.state === "ok" ? neighbours.areaName : area;
  const lineCopy = { answers: copy.answers, line: copy.line };

  return (
    <div className="flex flex-col gap-sm" data-testid="listing-neighbours">
      {flooding !== undefined && (
        <p className="nf-body-sm inline-flex items-start gap-inline-tight text-[var(--nf-content-primary)]" data-testid="neighbours-lister-flood">
          <UiIcon name="info" size={16} className="mt-3xs shrink-0 text-[var(--nf-content-muted)]" />
          <span className="break-words">{copy.listerFlood[flooding ?? "unanswered"]}</span>
        </p>
      )}
      {neighbours.state === "ok" && neighbours.summary.kinds.length > 0 && (
        <div>
          <p className="nf-label">{copy.residents.replace("{area}", areaName)}</p>
          <ul className="mt-inline-tight flex flex-col gap-2xs">
            {neighbours.summary.kinds.map((kind) => (
              <li key={kind.kind} className="nf-body-sm break-words text-[var(--nf-content-secondary)]" data-testid={`neighbours-${kind.kind}`}>
                <strong className="text-[var(--nf-content-primary)]">{copy.kinds[kind.kind]}:</strong> {kindLine(kind, lineCopy)}
              </li>
            ))}
          </ul>
        </div>
      )}
      {neighbours.state === "ok" && neighbours.summary.kinds.length === 0 && (
        <p className="nf-caption text-[var(--nf-content-muted)]">{copy.tooFew.replace("{area}", areaName)}</p>
      )}
      {neighbours.state === "no-area" && (
        <p className="nf-caption text-[var(--nf-content-muted)]">{copy.noArea.replace("{area}", area)}</p>
      )}
    </div>
  );
}
