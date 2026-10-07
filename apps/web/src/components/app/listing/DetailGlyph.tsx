import { ICON_PLATE_GLYPH, IconPlate, type IconPlateSize, type IconPlateTone } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import "@/app/css/catalogue.css";

/**
 * THE DETAIL PAGES' ROW GLYPH (the founder, 29 September 2026).
 *
 * The listing and stay detail pages drew a glass object at 40px on every fee
 * row and on the light, water and gate rows, and at that size the glass set
 * blurs into coloured squares beside bold type
 * (`docs/design/references/2026-09-29/20-listing-fees-glass-now.png`). Each
 * row now carries a lean line glyph on the shared `IconPlate`, in its
 * neutral tone like every other row on the platform (plate v2,
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 4).
 *
 *   size  "sm" 36px, a dense row; "md" 44px, a cost row (default); "lg" 56px,
 *         a total or a confirmation
 *   tone  "neutral" (default), "brand" for the one row that is the point, or
 *         a state tone for a warning or a success
 *
 * Decorative (`aria-hidden` on the plate): the row's words carry the meaning.
 */
export function DetailGlyph({
  name,
  size = "md",
  tone = "neutral",
  filled,
  className,
}: {
  name: UiIconName;
  size?: IconPlateSize;
  tone?: IconPlateTone;
  filled?: boolean;
  className?: string;
}) {
  return (
    <IconPlate
      size={size}
      tone={tone}
      className={["nf-detail-glyph", className ?? ""].filter(Boolean).join(" ")}
    >
      <UiIcon name={name} size={ICON_PLATE_GLYPH[size]} filled={filled} />
    </IconPlate>
  );
}
