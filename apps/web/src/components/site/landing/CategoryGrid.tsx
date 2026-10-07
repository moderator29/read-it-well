import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { Icon3D } from "@/components/ui/Icon3D";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ListingKind } from "@/lib/listings/types";
import { photo, type PhotoName } from "@/lib/site/photos";
import type { Door } from "./doors";
import { CITIES, NigeriaMapArt } from "./NigeriaMap";
import { SectionHead } from "./SectionHead";
import { CATEGORY_OBJECTS, LANDING_OBJECT_SIZE } from "./landing-objects";

/**
 * Explore by category: eight photo tiles linking to real searches.
 *
 * The render's eight are Apartments, Houses, Shortlets, Hotels, Resorts,
 * Guest Houses, Commercial, Land, and all eight now ship, on the founder's
 * ruling of 19 September.
 *
 * Resorts and guest houses were thought to be markets this catalogue does
 * not have. They are: `resort` and `guest_house` are both stay types in
 * lib/stays/types.ts, so those two tiles are doors into the Stays search
 * rather than the property search, which is why a tile carries its own href
 * instead of deriving one from a `ListingKind`. Commercial is the office
 * market, which is the commercial stock the catalogue actually holds.
 *
 * A tile that crosses to the Stays side has no `kind`, so it prints no
 * count: `counts` is a tally of property kinds and cannot answer for a stay
 * type. No number is the honest answer there, and the design law allows a
 * tile to stand on its name alone.
 *
 * COUNTS ARE SHOWN ONLY WHEN THEY ARE PROVABLY COMPLETE. `counts` is null
 * unless the page that computed it held the whole catalogue (see
 * `landingData` in LandingBody.tsx for the check); a null prints no number
 * at all, which the design law allows and an invented one does not.
 *
 * EIGHT TILES, EIGHT OBJECTS (R1 finding A11; the founder's 3D set, 30
 * September): what each tile is actually about, never the same object
 * twice.
 *
 * THE CITIES LIVE HERE NOW (UIUX item 9): the chips under the tiles, with
 * the drawn map beside them from 64rem. Every tile and chip is an honest
 * door (`doors.ts`).
 *
 * The plates are mapped by hand. Land takes
 * the bridge skyline as the closest honest plate: a category tile is a door
 * into a market, not a picture of one listing, so the objection `MediaFrame`
 * raises to a building on a plot does not apply here.
 */

export function CategoryGrid({
  t,
  counts,
  door,
}: {
  t: Dictionary;
  counts: ReadonlyMap<ListingKind, number> | null;
  door: Door;
}) {
  const m = t.landingRooms.map;
  const c = t.landing.face.categories;
  /* Each tile carries the founder's 3D object for its kind
     (`CATEGORY_OBJECTS`), one size for all eight. */
  const tiles: {
    key: keyof typeof CATEGORY_OBJECTS;
    href: string;
    /** Absent on a tile that crosses to the Stays side; see the note above. */
    kind?: ListingKind;
    label: string;
    photo: PhotoName;
  }[] = [
    { key: "apartment", href: "/search?type=apartment", kind: "apartment", label: c.apartments, photo: "tower-entrance-dusk" },
    { key: "home", href: "/search?type=home", kind: "home", label: c.houses, photo: "villa-exterior-gate" },
    { key: "shortlet", href: "/stays/search?type=shortlet", kind: "shortlet", label: c.shortlets, photo: "villa-pool-terrace" },
    { key: "hotel", href: "/stays/search?type=hotel", kind: "hotel", label: c.hotels, photo: "bedroom-02" },
    { key: "resort", href: "/stays/search?type=resort", label: c.resorts, photo: "resort-pool-deck" },
    { key: "guest_house", href: "/stays/search?type=guest_house", label: c.guestHouses, photo: "villa-pool-skyline-01" },
    { key: "office", href: "/search?type=office", kind: "office", label: c.commercial, photo: "skyline-waterfront-dusk" },
    { key: "land", href: "/search?type=land", kind: "land", label: c.land, photo: "skyline-bridge-dusk" },
  ];

  return (
    <section className="nf-shell nf-room" data-chapter="categories" aria-labelledby="nf-landing-cats-title">
      <div className="nf-landing-split nf-landing-split--even">
        <SectionHead id="nf-landing-cats-title" eyebrow={c.overline} title={c.title} lede={c.body} />
        <MotionReveal as="ul" stagger className="nf-landing-cats">
          {tiles.map((tile) => {
            const count = tile.kind ? (counts?.get(tile.kind) ?? 0) : 0;
            return (
              <li key={tile.key}>
                <Link href={door(tile.href)} prefetch={false} className="nf-landing-cat" data-theme="dark">
                  <Image
                    src={photo(tile.photo)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 50vw, 200px"
                  />
                  <span className="nf-landing-cat-body">
                    <span className="nf-obj nf-landing-cat-obj">
                      <Icon3D name={CATEGORY_OBJECTS[tile.key]} size={LANDING_OBJECT_SIZE.category} />
                    </span>
                    <span className="min-w-0">
                      <span className="nf-landing-cat-title">{tile.label}</span>
                      {count > 0 && (
                        <span className="nf-landing-cat-count nf-numeric">
                          {c.count.replace("{count}", String(count))}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </MotionReveal>
      </div>

      {/* THE CITIES (UIUX item 9): the map's chips, folded into this room
          under their own label, with the drawn map beside them (under them
          on a phone since Session 3's pass): the page's map moment. */}
      <div className="nf-cities">
        <div className="nf-cities__list">
          <p className="nf-section-label">{m.cities}</p>
          <ul className="nf-map-room__list">
            {CITIES.map((city) => (
              <li key={city}>
                <Link href={door(`/search?q=${encodeURIComponent(city)}`)} prefetch={false} className="nf-map-room__chip" data-city={city}>
                  <UiIcon name="location" size={16} aria-hidden />
                  {city}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="nf-cities__map">
          <NigeriaMapArt />
        </div>
      </div>
    </section>
  );
}
