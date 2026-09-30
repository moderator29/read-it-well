import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import type { Icon3DName } from "./icon-3d";

/**
 * THE FOUNDER'S 3D OBJECTS IN EMPTY STATES (30 September): "use them in every
 * area used". A state that names an object (`icon`) draws its 3D twin when
 * the founder's sheets have one; everything else keeps the line glyph on the
 * flat plate. A call site can still pick an object (`art`) or opt out
 * (`art={false}`).
 *
 * Only clear matches: an error, a camera, a contract or a chat has no 3D
 * twin and stays a glyph.
 */
export const STATE_ART: Partial<Record<BrandIconName, Icon3DName>> = {
  "bell-badge": "bell",
  "search-ring": "search",
  "listing-search": "search",
  "home-search": "search",
  "search-home": "search",
  "calendar-check": "calendar-booked",
  "calendar-home": "calendar-booked",
  "calendar-clock": "calendar-pending",
  "calendar-grid": "calendar-pending",
  "shield-check": "shield",
  "user-verified": "id-check",
  "globe-pin": "explore",
  "card-lock": "card-secure",
  "keys-home": "keys",
  "home-ring": "home-small",
  "heart-home": "villa",
  "ledger-book": "earnings",
  reviews: "stay-rated",
  "hotel-bed": "stay-rated",
  hotel: "hotel",
  "concierge-bell": "restaurant",
  "bank-column": "earnings",
  "receipt-check": "pay",
  hourglass: "calendar-pending",
};

export function stateArtFor(icon: BrandIconName | undefined, art?: Icon3DName | false): Icon3DName | undefined {
  if (art === false) return undefined;
  if (art) return art;
  return icon ? STATE_ART[icon] : undefined;
}
