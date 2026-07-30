/**
 * Amenity labels for discovery chips.
 *
 * The codes are the platform's own: the eighteen the agent listing flow
 * writes (`lib/agent/listings-schema.ts`) plus whatever a catalogue row
 * already carries. Nothing here invents a code, and an unknown one is
 * prettified rather than dropped, so a listing is never filtered by a chip
 * that does not exist or hidden because its amenity has no entry yet.
 */
const LABELS: Record<string, string> = {
  wifi: "Free Wi-Fi",
  ac: "Air conditioning",
  tv: "TV",
  kitchen: "Kitchen",
  parking: "Parking",
  pool: "Swimming pool",
  gym: "Gym",
  security: "Security",
  elevator: "Lift",
  furnished: "Furnished",
  balcony: "Balcony",
  garden: "Garden",
  laundry: "Laundry",
  generator: "Backup power",
  water: "Running water",
  shower: "Hot shower",
  breakfast: "Breakfast",
  workspace: "Workspace",
};

/** Presentation order for the chips. Unknown codes follow, alphabetically. */
const ORDER = Object.keys(LABELS);

export function amenityLabel(code: string): string {
  const known = LABELS[code];
  if (known) return known;
  const spaced = code.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Sort codes into the canonical order, with anything unrecognised after it. */
export function sortAmenityCodes(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    const ia = ORDER.indexOf(a);
    const ib = ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}
