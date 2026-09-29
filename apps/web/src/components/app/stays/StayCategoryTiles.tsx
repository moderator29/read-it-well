import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { panelClass } from "@/components/ui/Panel";

/**
 * The five category tiles of FD3DFE84, each a glass square with its object.
 *
 * `type` rides the stays search URL and narrows the projection by its `kind`
 * column (see /stays/search). The tile for the type in the address lights.
 */
export type StayCategory = {
  key: keyof Pick<Dictionary["catalogue"]["stays"], "hotels" | "apartments" | "resorts" | "guestHouses" | "serviced">;
  icon: BrandIconName;
  type: string;
};

export const STAY_CATEGORY_TILES: readonly StayCategory[] = [
  { key: "hotels", icon: "hotel-room", type: "hotel" },
  { key: "apartments", icon: "studio-apartment", type: "apartment" },
  { key: "resorts", icon: "beach-house", type: "resort" },
  { key: "guestHouses", icon: "bungalow", type: "guest_house" },
  { key: "serviced", icon: "serviced-apartment", type: "serviced_apartments" },
];

export function StayCategoryTiles({ t, active }: { t: Dictionary; active?: string }) {
  const copy = t.catalogue.stays;
  return (
    <ul className="nf-stays-tiles nf-scroll-x" data-testid="stay-category-tiles">
      {STAY_CATEGORY_TILES.map((tile) => {
        const on = active === tile.type;
        return (
          <li key={tile.key}>
            <Link
              href={`/stays/search?type=${tile.type}`}
              aria-current={on ? "true" : undefined}
              className={panelClass({ variant: "card", className: `nf-stays-tile ${on ? "nf-stays-tile--on" : ""}` })}
            >
              <span className="nf-stays-tile__object" aria-hidden="true">
                <BrandIcon name={tile.icon} fill drawn={32} />
              </span>
              <span>{copy[tile.key]}</span>
              <UiIcon name="arrow-right" size={14} className="nf-stays-tile__go" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
