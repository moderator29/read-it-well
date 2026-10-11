import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { panelClass } from "@/components/ui/Panel";
import { amenityLabel } from "@/components/app/filters/amenities";
import { ICON } from "@/components/app/Screen";
import "@/app/css/catalogue.css";

/**
 * The amenity tiles of 9E8B56ED: glass squares with a glyph and a word.
 *
 * Only what the lister stated. `limit` keeps the first row to the five the
 * render shows plus a "More" tile that jumps to the full list; with no limit
 * every amenity is drawn, which is what the Amenities section does.
 */
const AMENITY_ICON: Record<string, UiIconName> = {
  pool: "pool",
  wifi: "wifi",
  kitchen: "kitchen",
  parking: "parking",
  security: "verified",
  generator: "bolt",
  gym: "bolt",
  ac: "snowflake",
  tv: "picture",
  furnished: "home",
  balcony: "building-apartment",
  garden: "map",
  laundry: "washing-machine",
  water: "droplet",
  shower: "bath",
  breakfast: "utensils",
  workspace: "document",
  elevator: "arrow-up",
};

export function ListingAmenityTiles({
  amenities,
  limit,
  moreHref,
  moreLabel,
}: {
  amenities: string[];
  limit?: number;
  moreHref?: string;
  moreLabel?: string;
}) {
  if (amenities.length === 0) return null;
  const shown = limit ? amenities.slice(0, limit) : amenities;
  const remainder = amenities.length - shown.length;
  /*
   * THE LEAD ROW SCROLLS, THE SECTION WRAPS, and both tiles are small.
   *
   * The render draws six small square tiles across the lead card, each a
   * glyph over a two-line caption, and a "More" tile at the end. Ours were
   * three per row at 5rem tall with the label wrapping inside them, which
   * is the same information at three times the size and is what the
   * founder's send-back calls enormous. `limit` is what the lead row
   * passes, so it is also the signal that this is the scrolling row.
   */
  const row = limit !== undefined;
  return (
    <ul
      className={row ? "nf-amenity-row nf-scroll-x" : "nf-amenity-grid"}
      data-testid="amenity-tiles"
    >
      {shown.map((code) => (
        <li key={code} className={panelClass({ variant: "card", className: "nf-amenity-tile" })}>
          <UiIcon name={AMENITY_ICON[code] ?? "circle-check"} size={ICON.inline} />
          <span>{amenityLabel(code)}</span>
        </li>
      ))}
      {remainder > 0 && moreHref && (
        <li className="contents">
          <a href={moreHref} className={panelClass({ variant: "card", className: "nf-amenity-tile" })}>
            <UiIcon name="more" size={ICON.inline} />
            <span>
              {moreLabel ?? "More"} (+{remainder})
            </span>
          </a>
        </li>
      )}
    </ul>
  );
}
