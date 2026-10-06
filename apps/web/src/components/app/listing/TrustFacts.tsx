import Link from "next/link";
import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { proofDate } from "@/lib/trust/proof-strip";
import { DetailGlyph } from "./DetailGlyph";
import type { EarnedTrust } from "./earned-trust";

/**
 * THE SPACE'S TRUST FACTS, AS DATES (north star 12 point 15; handoff Stage 5).
 *
 * "Inspected 12 July 2026 is a fact a reader can weigh; a tick is a promise"
 * (`docs/PRODUCT.md` section 6). The page used to draw "Inspected by Vallo"
 * and "Address checked" as a run of icon-and-word marks with no date, which
 * is a tick wearing a sentence. Each is now a row whose value IS the date, on
 * the same Plate rhythm as the cost rows, and the proof strip's own dated
 * lines (identity, credentials, authority, renters) follow beneath it.
 *
 * WHAT IT NEVER DRAWS. A check with no date is not a row: absent is absent,
 * never "Not inspected" and never a crossed-out mark, because a null must
 * never read as a negative. An example row reaches this with every field
 * already cleared by `earnedTrust`, so it draws the same quiet lede a real
 * unchecked listing draws, and nothing that says "example" (D24).
 *
 * The proof strip itself is handed in by the page (`strip`, with its line
 * count in `proofCount`), so the route that reads the credentials is the one
 * that mounts the strip, and this component only decides the order and the
 * empty state.
 *
 * Two shapes. `summary` sits on the listing page and ends on the door to the
 * inner page; `full` IS the inner page's body and has no door.
 */
export function TrustFacts({
  listingId,
  trust,
  strip,
  proofCount,
  locale,
  t,
  variant = "summary",
}: {
  listingId: string;
  trust: Pick<EarnedTrust, "inspectedAt" | "addressCheckedAt">;
  /** `<ProofStrip variant="full" />`, mounted by the page. */
  strip: ReactNode;
  /** How many lines that strip draws; zero means it draws nothing. */
  proofCount: number;
  locale: Locale;
  t: Dictionary;
  variant?: "summary" | "full";
}) {
  const copy = t.experienceDetail.trust;
  const rows: { key: string; icon: UiIconName; label: string; at: string }[] = [];
  if (trust.inspectedAt) rows.push({ key: "inspected", icon: "home", label: copy.inspected, at: trust.inspectedAt });
  if (trust.addressCheckedAt)
    rows.push({ key: "address", icon: "location", label: copy.addressChecked, at: trust.addressCheckedAt });
  const dated = rows.length + proofCount;

  return (
    <div className="nf-trust" data-testid={variant === "full" ? "trust-facts-full" : "trust-facts"}>
      {dated === 0 ? (
        <p className="nf-trust__lede" data-testid="trust-none">
          {variant === "full" ? copy.none : copy.lede}
        </p>
      ) : (
        <>
          {rows.length > 0 && (
            <dl className="nf-trust__rows">
              {rows.map((row) => (
                <div key={row.key} className="nf-trust__row" data-testid={`trust-${row.key}`}>
                  <dt className="nf-trust__label">
                    <DetailGlyph name={row.icon} size="sm" />
                    <span>{row.label}</span>
                  </dt>
                  <dd className="nf-trust__date nf-numeric">
                    <time dateTime={row.at}>{proofDate(row.at, locale)}</time>
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {proofCount > 0 && <div className="mt-row">{strip}</div>}
        </>
      )}

      {variant === "summary" && (
        <Link href={`/listing/${listingId}/trust`} className="nf-trust__door" data-testid="trust-door">
          {/* The section above carries the question as its heading, so the
              door says only where it goes. */}
          <span className="nf-trust__door-title min-w-0">{copy.open}</span>
          <UiIcon name="chevron-right" size={20} className="shrink-0" />
        </Link>
      )}
    </div>
  );
}
