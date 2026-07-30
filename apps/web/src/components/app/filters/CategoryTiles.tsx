import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { toSearchHref, type DiscoveryQuery } from "@/lib/listings/search-params";
import type { ListingKind } from "@/lib/listings/types";

/**
 * The markets we actually run, as tiles.
 *
 * One tile per real `ListingKind`, never an invented category, each carrying
 * its commissioned 3D object on the platform's glass tile. The icon choices
 * match the home screen's category rail deliberately: the same market must not
 * wear a different face on two surfaces.
 *
 * Every tile is a link that writes `type=` into the address, so a category is
 * shareable, works with the back button and survives a hard reload. Tapping the
 * active tile clears the category rather than dead-ending on it.
 */
const CATEGORIES: { kind: ListingKind; icon: BrandIconName }[] = [
  { kind: "hotel", icon: "hotel-star" },
  { kind: "apartment", icon: "homes-sparkle" },
  { kind: "home", icon: "house-sparkle" },
  { kind: "shortlet", icon: "calendar-home" },
  { kind: "villa", icon: "heart-home" },
  { kind: "rental", icon: "keys-home" },
  { kind: "restaurant", icon: "gift" },
  { kind: "experience", icon: "luggage-check" },
];

export function CategoryTiles({ query, t }: { query: DiscoveryQuery; t: Dictionary }) {
  /*
   * Labels come from the dictionary wherever the market has a key. Shortlets
   * and villas have none yet, so they read in English until the dictionary
   * carries them; a missing translation must not remove a market from
   * discovery.
   */
  const label: Record<ListingKind, string> = {
    hotel: t.nav.hotels,
    apartment: t.nav.apartments,
    home: t.nav.homes,
    shortlet: "Shortlets",
    villa: "Villas",
    rental: t.nav.rent,
    restaurant: t.nav.restaurants,
    experience: t.nav.experiences,
  };

  return (
    <nav aria-label="Categories" className="nf-scroll-x -mx-5 md:-mx-8">
      <ul className="flex gap-2.5 px-5 md:px-8">
        <li className="shrink-0">
          <Link
            href={toSearchHref({ ...query, kind: undefined })}
            prefetch
            data-testid="category-all"
            aria-current={query.kind ? undefined : "true"}
            className={`nf-card nf-card--interactive flex h-full w-[5.5rem] flex-col items-center gap-2 p-2.5 text-center ${
              query.kind ? "" : "ring-2 ring-[var(--nf-brand-primary)]"
            }`}
          >
            <span className="block h-11 w-11">
              <BrandIcon name="home-search" fill />
            </span>
            <span
              className={`text-[0.6875rem] font-semibold leading-tight ${
                query.kind
                  ? "text-[var(--nf-content-secondary)]"
                  : "text-[var(--nf-content-primary)]"
              }`}
            >
              Everything
            </span>
          </Link>
        </li>
        {CATEGORIES.map((category) => {
          const active = query.kind === category.kind;
          return (
            <li key={category.kind} className="shrink-0">
              <Link
                href={toSearchHref({
                  ...query,
                  kind: active ? undefined : category.kind,
                })}
                prefetch
                data-testid={`category-${category.kind}`}
                aria-current={active ? "true" : undefined}
                className={`nf-card nf-card--interactive flex h-full w-[5.5rem] flex-col items-center gap-2 p-2.5 text-center ${
                  active ? "ring-2 ring-[var(--nf-brand-primary)]" : ""
                }`}
              >
                <span className="block h-11 w-11">
                  <BrandIcon name={category.icon} fill />
                </span>
                <span
                  className={`text-[0.6875rem] font-semibold leading-tight ${
                    active
                      ? "text-[var(--nf-content-primary)]"
                      : "text-[var(--nf-content-secondary)]"
                  }`}
                >
                  {label[category.kind]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
