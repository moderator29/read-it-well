import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { photo } from "@/lib/site/photos";
import { SectionHead } from "./SectionHead";
import { Sweep } from "./Sweep";

/**
 * The Stays band: the resort pool plate on the left, the copy and the six
 * stay kinds on the right, each a real search. Restaurants and experiences
 * are on the Stays side of the product, so they list here.
 */
export function StaysBand({ t }: { t: Dictionary }) {
  const s = t.landing.face.stays;
  /* Glass objects, not stroked glyphs: the render draws a blue glass mark in
     a glass square on every row, and a row never mixes the two tiers. */
  const list: { href: string; label: string; icon: BrandIconName }[] = [
    /* The render's six, in its order. Every href is a stay type the Stays
       side actually serves (lib/stays/types.ts) or, for restaurants, their
       own surface, so no row here is a door into an empty room. */
    { href: "/stays/search?type=hotel", label: s.hotels, icon: "hotel" },
    { href: "/stays/search?type=apartment", label: s.apartments, icon: "apartment-block" },
    { href: "/stays/search?type=resort", label: s.resorts, icon: "villa" },
    { href: "/stays/search?type=guest_house", label: s.guestHouses, icon: "hotel-star" },
    { href: "/stays/search?type=serviced_apartments", label: s.serviced, icon: "serviced-block" },
    { href: "/restaurants", label: s.restaurants, icon: "concierge-bell" },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="stays" aria-labelledby="nf-landing-stays-title">
      <Reveal>
        <div className="nf-landing-band">
          <div className="nf-landing-band-photo">
            <Image
              src={photo("resort-pool-deck")}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
            />
          </div>
          <div className="nf-landing-band-body">
            <div>
              <SectionHead id="nf-landing-stays-title" eyebrow={s.overline} title={s.title} lede={s.body} />
              <div className="mt-heading">
                <ButtonLink href="/stays" variant="primary" size="md" trailingIcon="arrow-right" className="nf-magnetic">
                  <Sweep />
                  {s.cta}
                </ButtonLink>
              </div>
            </div>
            <ul className="nf-landing-list">
              {list.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} prefetch={false}>
                    <span>
                      <BrandIcon name={item.icon} fill />
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
