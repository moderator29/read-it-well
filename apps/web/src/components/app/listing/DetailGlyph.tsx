import { IconPlate, type IconPlateSize, type IconPlateTone } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * THE DETAIL PAGES' ROW GLYPH (the founder, 29 September 2026).
 *
 * The listing and stay detail pages drew a glass object at 40px on every fee
 * row and on the light, water and gate rows, and at that size the glass set
 * blurs into coloured squares beside bold type
 * (`docs/design/references/2026-09-29/20-listing-fees-glass-now.png`). Each
 * row now carries a bold line glyph on the shared `IconPlate`, the treatment
 * the profile rows use: in light a soft brand-tinted tile with a hairline and
 * the glyph in brand blue, at night the navy glass plate with the glyph in the
 * bright end of the brand blue (`.nf-detail-glyph`, catalogue.css).
 *
 *   size  "sm" 36px, a dense row; "md" 44px, a cost row (default); "lg" 56px,
 *         a total or a confirmation
 *   tone  "brand" (default), or a state tone for a warning or a success
 *
 * Decorative (`aria-hidden` on the plate): the row's words carry the meaning.
 */
export function DetailGlyph({
  name,
  size = "md",
  tone = "brand",
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
      <UiIcon name={name} size={size === "lg" ? 28 : 20} filled={filled} />
    </IconPlate>
  );
}
