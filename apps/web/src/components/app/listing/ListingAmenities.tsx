import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The spec row.
 *
 * Reference 3 states the facts of a property as one inline icon/value run -
 * beds, baths, area - separated by middots, not as a scrolling row of chips.
 * Chips read as filters you could press; this is data, and it should look like
 * data. So the row is now an inline wrapping list: the counts first in the
 * primary tone because they are what a reader scans for, then the amenities the
 * listing actually carries in the muted tone, with a middot between every pair.
 *
 * The reference's third spec is floor area. The `Listing` type has no area
 * field - `area` on it is a locality name, not a size - so rather than invent a
 * number the third slot carries the derived sleeping capacity, which the page
 * already states in prose and which comes from a field that exists.
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

type Mark = { key: string; icon: UiIconName; label: string; spec?: boolean };

export function ListingAmenities({
  bedrooms,
  bathrooms,
  amenities,
  guests,
}: {
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  /**
   * Sleeping capacity, when the page has one to state. Derived upstream from
   * the bedroom count; omitted for anything that does not sleep guests.
   */
  guests?: number;
}) {
  const marks: Mark[] = [];

  if (bedrooms > 0) {
    marks.push({
      key: "bedrooms",
      icon: "bed",
      label: `${bedrooms} ${bedrooms === 1 ? "bedroom" : "bedrooms"}`,
      spec: true,
    });
  }
  if (bathrooms > 0) {
    marks.push({
      key: "bathrooms",
      icon: "bath",
      label: `${bathrooms} ${bathrooms === 1 ? "bathroom" : "bathrooms"}`,
      spec: true,
    });
  }
  if (guests && guests > 0) {
    marks.push({
      key: "guests",
      icon: "user",
      label: `Sleeps ${guests}`,
      spec: true,
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
      className="flex flex-wrap items-center gap-y-2 text-[0.875rem]"
    >
      {marks.map((mark, i) => (
        <li
          key={mark.key}
          className={`flex items-center ${
            mark.spec
              ? "font-semibold text-[var(--nf-content-primary)]"
              : "text-[var(--nf-content-secondary)]"
          }`}
        >
          {/* The separator lives inside the item so the row stays a flat list
              of marks; a divider of its own would be a list item that is not
              a fact about the property. */}
          {i > 0 && (
            <span aria-hidden="true" className="px-2 text-[var(--nf-content-muted)]">
              ·
            </span>
          )}
          <UiIcon
            name={mark.icon}
            size={16}
            className="mr-1.5 shrink-0 text-[var(--nf-content-muted)]"
          />
          <span className="whitespace-nowrap">{mark.label}</span>
        </li>
      ))}
    </ul>
  );
}
