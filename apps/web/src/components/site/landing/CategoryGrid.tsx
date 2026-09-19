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
 * Guest Houses, Commercial, Land. Resorts and guest houses are not markets
 * this catalogue has, so a tile for either would link to an empty result,
 * and "Commercial" is two markets (shops, offices) behind one `type`. The
 * eight shipped are the eight real kinds with the most stock: villas and
 * yearly rentals take the two invented slots, and offices stand for
 * commercial. Shops and restaurants keep their place in the stays list and
 * the footer.
 *
 * COUNTS ARE SHOWN ONLY WHEN THEY ARE PROVABLY COMPLETE. `counts` is null
 * unless the page that computed it held the whole catalogue (see
 * `landingData` in LandingBody.tsx for the check); a null prints no number
 * at all, which the design law allows and an invented one does not.
 *
 * The plates are the lead's mapping (re-audit, ledger section 6). Land takes
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
  const tiles: { kind: ListingKind; label: string; photo: PhotoName; icon: BrandIconName }[] = [
    { kind: "apartment", label: c.apartments, photo: "tower-entrance-dusk", icon: "serviced-block" },
    { kind: "home", label: c.houses, photo: "villa-exterior-gate", icon: "modern-house" },
    { kind: "shortlet", label: c.shortlets, photo: "villa-pool-terrace", icon: "shortlet" },
    { kind: "hotel", label: c.hotels, photo: "bedroom-02", icon: "hotel" },
    { kind: "villa", label: c.villas, photo: "villa-pool-skyline-01", icon: "villa" },
    { kind: "rental", label: c.rentals, photo: "living-room-dusk", icon: "keys-home" },
    { kind: "office", label: c.offices, photo: "skyline-waterfront-dusk", icon: "office-space" },
    { kind: "land", label: c.land, photo: "skyline-bridge-dusk", icon: "land-plot" },
  ];

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-landing-cats-title">
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
            const count = counts?.get(tile.kind) ?? 0;
            return (
              <Reveal as="li" key={tile.kind} delay={i * 40}>
                <Link
                  href={`/search?type=${tile.kind}`}
                  prefetch={false}
                  className="nf-landing-cat"
                >
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
