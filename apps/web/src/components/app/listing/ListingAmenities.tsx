import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The amenity row.
 *
 * The dense strip of marks a traveller scans before reading anything else:
 * the room counts first, then whatever the listing actually offers. These are
 * small marks in a scrolling row, so they are stroked UiIcon glyphs, never the
 * 3D pack, which needs 40px and a tile to read at all.
 *
 * Nothing here is invented. Only keys the listing carries are rendered, a key
 * with no glyph of its own still appears under a generic feature mark with its
 * name prettified, and a listing with no amenities on file says so plainly
 * rather than filling the row with guesses.
 */

const AMENITY_MARK: Record<string, { icon: UiIconName; label: string }> = {
  pool: { icon: "pool", label: "Swimming pool" },
  wifi: { icon: "wifi", label: "Wi-Fi" },
  kitchen: { icon: "kitchen", label: "Fitted kitchen" },
  parking: { icon: "parking", label: "Parking on site" },
};

function prettify(key: string): string {
  const spaced = key.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

type Mark = { key: string; icon: UiIconName; label: string };

export function ListingAmenities({
  bedrooms,
  bathrooms,
  amenities,
}: {
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
}) {
  const marks: Mark[] = [];

  if (bedrooms > 0) {
    marks.push({
      key: "bedrooms",
      icon: "bed",
      label: `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}`,
    });
  }
  if (bathrooms > 0) {
    marks.push({
      key: "bathrooms",
      icon: "bath",
      label: `${bathrooms} ${bathrooms === 1 ? "bathroom" : "bathrooms"}`,
    });
  }
  for (const key of amenities) {
    const known = AMENITY_MARK[key];
    marks.push(
      known
        ? { key, icon: known.icon, label: known.label }
        : { key, icon: "sparkle", label: prettify(key) },
    );
  }

  if (marks.length === 0) {
    return (
      <p className="text-[0.875rem] text-[var(--nf-content-muted)]">
        The agent has not listed what this place offers yet. Ask in Messages
        before you book.
      </p>
    );
  }

  return (
    <ul
      data-testid="amenity-row"
      className="nf-scroll-x -mx-5 flex gap-2 px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {marks.map((mark) => (
        <li key={mark.key} className="nf-chip shrink-0 gap-2 px-3.5 py-2">
          <UiIcon name={mark.icon} size={16} className="shrink-0" />
          <span className="whitespace-nowrap text-[0.8125rem]">{mark.label}</span>
        </li>
      ))}
    </ul>
  );
}
