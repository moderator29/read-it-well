import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { photo } from "@/lib/site/photos";

/**
 * The Stays band: the resort pool plate on the left, the copy and the six
 * stay kinds on the right, each a real search. Restaurants and experiences
 * are on the Stays side of the product, so they list here.
 */
export function StaysBand({ t }: { t: Dictionary }) {
  const s = t.landing.face.stays;
  const list: { href: string; label: string; icon: UiIconName }[] = [
    { href: "/stays/search?type=hotel", label: s.hotels, icon: "building-hotel" },
    { href: "/stays/search?type=shortlet", label: s.shortlets, icon: "bed" },
    { href: "/stays/search?type=apartment", label: s.apartments, icon: "building-apartment" },
    { href: "/stays/search?type=villa", label: s.villas, icon: "pool" },
    { href: "/restaurants", label: s.restaurants, icon: "utensils" },
    { href: "/search?type=experience", label: s.experiences, icon: "ticket" },
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
                      <UiIcon name={item.icon} size={16} aria-hidden />
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
