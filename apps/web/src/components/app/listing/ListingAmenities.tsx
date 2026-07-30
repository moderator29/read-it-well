import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * Amenities grid.
 *
 * Driven entirely by the listing's amenity keys. Known keys get their signature
 * 3D icon and a proper label; an unknown key still renders honestly with a
 * generic icon and a prettified name rather than being silently dropped.
 */
const AMENITY_META: Record<string, { icon: BrandIconName; label: string }> = {
  pool: { icon: "luggage-check", label: "Swimming pool" },
  wifi: { icon: "home-cam", label: "Wi-Fi" },
  kitchen: { icon: "home-check", label: "Fitted kitchen" },
  parking: { icon: "map-spot", label: "Parking on site" },
};

function prettify(key: string): string {
  const spaced = key.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function ListingAmenities({ amenities }: { amenities: string[] }) {
  if (amenities.length === 0) {
    return (
      <p className="text-[0.875rem] text-[var(--nf-content-muted)]">
        The agent has not listed amenities for this place yet. Ask about them in
        Messages before you book.
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {amenities.map((key) => {
        const meta = AMENITY_META[key] ?? { icon: "service" as BrandIconName, label: prettify(key) };
        return (
          <li key={key} className="nf-chip justify-start gap-3 px-3 py-2.5">
            <span className="block h-12 w-12 shrink-0">
              <BrandIcon name={meta.icon} fill />
            </span>
            <span className="truncate text-[0.8125rem]">{meta.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
