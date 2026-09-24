import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import type { ListingKind } from "@/lib/listings/types";
import { photo, type PhotoName } from "@/lib/site/photos";

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
 * EIGHT TILES, EIGHT OBJECTS (R1 finding A11). Four of the eight carried
 * near-identical glass buildings, so a reader scanning the grid saw the same
 * mark four times: shortlets take the calendar, resorts the palm, commercial
 * the tower and land the map pin, which is what each tile is actually about.
 *
 * The plates are mapped by hand. Land takes
 * the bridge skyline as the closest honest plate: a category tile is a door
 * into a market, not a picture of one listing, so the objection `MediaFrame`
 * raises to a building on a plot does not apply here.
 */
export function CategoryGrid({
  t,
  counts,
}: {
  t: Dictionary;
  counts: ReadonlyMap<ListingKind, number> | null;
}) {
  const c = t.landing.face.categories;
  /* The glyph on each tile is a glass object (the render draws a blue glass
     building in a glass square on every tile), so the whole row is on the
     BrandIcon tier: no stroked glyph sits beside a glass one. */
  const tiles: {
    key: string;
    href: string;
    /** Absent on a tile that crosses to the Stays side; see the note above. */
    kind?: ListingKind;
    label: string;
    photo: PhotoName;
    icon: BrandIconName;
  }[] = [
    { key: "apartment", href: "/search?type=apartment", kind: "apartment", label: c.apartments, photo: "tower-entrance-dusk", icon: "serviced-block" },
    { key: "home", href: "/search?type=home", kind: "home", label: c.houses, photo: "villa-exterior-gate", icon: "modern-house" },
    { key: "shortlet", href: "/stays/search?type=shortlet", kind: "shortlet", label: c.shortlets, photo: "villa-pool-terrace", icon: "calendar-home" },
    { key: "hotel", href: "/stays/search?type=hotel", kind: "hotel", label: c.hotels, photo: "bedroom-02", icon: "hotel" },
    { key: "resort", href: "/stays/search?type=resort", label: c.resorts, photo: "resort-pool-deck", icon: "palm-tree" },
    { key: "guest_house", href: "/stays/search?type=guest_house", label: c.guestHouses, photo: "villa-pool-skyline-01", icon: "hotel-star" },
    { key: "office", href: "/search?type=office", kind: "office", label: c.commercial, photo: "skyline-waterfront-dusk", icon: "building-chip" },
    { key: "land", href: "/search?type=land", kind: "land", label: c.land, photo: "skyline-bridge-dusk", icon: "pin-map" },
  ];

  return (
    <section className="nf-shell pt-section-tight pb-section" aria-labelledby="nf-landing-cats-title">
      <div className="nf-landing-split nf-landing-split--even">
        <Reveal className="flex flex-col gap-heading">
          <div>
            <span className="nf-overline text-[var(--nf-brand-secondary)]">{c.overline}</span>
            <h2 id="nf-landing-cats-title" className="nf-h1 mt-row max-w-measure-display">
              {c.title}
            </h2>
            <p className="nf-lede mt-group max-w-measure-lede">{c.body}</p>
          </div>
          <div>
            <ButtonLink href="/start" variant="primary" size="md" trailingIcon="arrow-right">
              {c.join}
            </ButtonLink>
          </div>
        </Reveal>
        <ul className="nf-landing-cats">
          {tiles.map((tile, i) => {
            const count = tile.kind ? (counts?.get(tile.kind) ?? 0) : 0;
            return (
              <Reveal as="li" key={tile.key} delay={i * 40}>
                <Link href={tile.href} prefetch={false} className="nf-landing-cat">
                  <Image
                    src={photo(tile.photo)}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 50vw, 200px"
                  />
                  <span className="nf-landing-cat-body">
                    <span className="nf-landing-cat-icon">
                      <BrandIcon name={tile.icon} fill />
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
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
