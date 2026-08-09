import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { toSearchHref, type DiscoveryQuery } from "@/lib/listings/search-params";
import type { ListingKind } from "@/lib/listings/types";

/**
 * The markets we actually run.
 *
 * One entry per real `ListingKind`, never an invented category. The icon
 * choices match the home screen's category rail deliberately: the same market
 * must not wear a different face on two surfaces.
 *
 * Each is a link that writes `type=` into the address, so a category is
 * shareable, works with the back button and survives a hard reload. Tapping the
 * active one clears the category rather than dead-ending on it.
 *
 * ---------------------------------------------------------------------------
 * NOTHING IS DRAWN AROUND THE OBJECTS ANY MORE, AND THE FILE IS NO LONGER
 * CALLED WHAT IT DOES.
 *
 * Twelve `nf-card` boxes in a scrolling row: twelve borders, twelve blurred
 * fills and twelve shadows, each containing a 44px commissioned 3D object and
 * 11px type. Three faults, and they compound:
 *
 *  - The object is ARTWORK. It is lit from the upper left and carries its own
 *    shadow, and a plate behind it flattens exactly the depth it was drawn to
 *    have. Twelve plates in a row read as a toolbar of buttons rather than as a
 *    set of places to go.
 *  - 11px semibold is below what anybody reads while scrolling a row sideways
 *    with a thumb, and it was the label carrying the entire meaning.
 *  - The active state was a 2px brand RING around the box, so selecting a
 *    category added a thirteenth edge to a row that already had twelve.
 *
 * Now the object sits on the page background with its label under it and
 * nothing around it, which is how the reference platform draws its category
 * grid. Bigger: 72px object, 14px label. The active state is a short brand
 * underline plus full-contrast ink - a mark UNDER the thing rather than a box
 * around it, which is the difference between pointing and containing.
 */
const CATEGORIES: { kind: ListingKind; icon: BrandIconName }[] = [
  { kind: "hotel", icon: "hotel-star" },
  { kind: "apartment", icon: "homes-sparkle" },
  { kind: "home", icon: "house-sparkle" },
  { kind: "shortlet", icon: "calendar-home" },
  { kind: "villa", icon: "heart-home" },
  { kind: "rental", icon: "keys-home" },
  { kind: "shop", icon: "tag-percent" },
  { kind: "office", icon: "doc-shield" },
  { kind: "land", icon: "map-spot" },
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
    shop: "Shops",
    office: "Offices",
    land: "Land",
    restaurant: t.nav.restaurants,
    experience: t.nav.experiences,
  };

  const entries: { kind: ListingKind | null; icon: BrandIconName; text: string }[] = [
    { kind: null, icon: "home-search", text: "Everything" },
    ...CATEGORIES.map((c) => ({ kind: c.kind, icon: c.icon, text: label[c.kind] })),
  ];

  return (
    /* The bleed and the padding that cancels it are one decision, so they take
       one value: the page gutter. They were -mx-5/px-5 stepping to -mx-8/px-8,
       which is the gutter's old fixed pair typed out by hand and no longer
       agrees with it now the gutter is a clamp. */
    <nav aria-label="Categories" className="nf-scroll-x -mx-gutter">
      <ul className="flex gap-lg px-gutter md:gap-xl">
        {entries.map((entry) => {
          const active = entry.kind === null ? !query.kind : query.kind === entry.kind;
          /* Tapping the active category clears it rather than dead-ending. */
          const href = toSearchHref({
            ...query,
            kind: entry.kind === null || active ? undefined : entry.kind,
          });

          return (
            <li key={entry.kind ?? "all"} className="shrink-0">
              <Link
                href={href}
                prefetch
                data-testid={entry.kind ? `category-${entry.kind}` : "category-all"}
                aria-current={active ? "true" : undefined}
                className="nf-tap flex w-[5.25rem] flex-col items-center gap-inline text-center"
              >
                <span className="nf-story-art block h-18 w-18">
                  <BrandIcon name={entry.icon} fill />
                </span>
                <span
                  className={`nf-body-sm font-semibold leading-snug ${
                    active
                      ? "text-[var(--nf-content-primary)]"
                      : "text-[var(--nf-content-secondary)]"
                  }`}
                >
                  {entry.text}
                </span>
                {/* The active mark: a short brand rule UNDER the label. It
                    occupies its own row in both states so nothing shifts when
                    the selection moves along the row. */}
                <span
                  aria-hidden="true"
                  className="block h-[3px] w-7 rounded-full"
                  style={{ background: active ? "var(--nf-brand-primary)" : "transparent" }}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
