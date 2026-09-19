import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { photo } from "@/lib/site/photos";

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
    { href: "/stays/search?type=hotel", label: s.hotels, icon: "hotel" },
    { href: "/stays/search?type=shortlet", label: s.shortlets, icon: "shortlet" },
    { href: "/stays/search?type=apartment", label: s.apartments, icon: "apartment-block" },
    { href: "/stays/search?type=villa", label: s.villas, icon: "villa" },
    { href: "/restaurants", label: s.restaurants, icon: "concierge-bell" },
    { href: "/search?type=experience", label: s.experiences, icon: "map-route" },
  ];
  return (
    <section className="nf-shell py-section" aria-labelledby="nf-landing-stays-title">
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
              <span className="nf-overline text-[var(--nf-brand-secondary)]">{s.overline}</span>
              <h2 id="nf-landing-stays-title" className="nf-h1 mt-row">
                {s.title}
              </h2>
              <p className="nf-lede mt-group max-w-measure-lede">{s.body}</p>
              <div className="mt-heading">
                <ButtonLink href="/stays" variant="primary" size="md" trailingIcon="arrow-right">
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
