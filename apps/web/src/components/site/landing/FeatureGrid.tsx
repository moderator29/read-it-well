import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * "Everything you need in one platform": the ten-tile glass grid.
 *
 * Every tile is a link to the real surface it names. The content icons are
 * the glass objects (BrandIcon) in an orb, never a stroked glyph, per the
 * icon ruling in docs/DESIGN_DIRECTION.md section 3.5.
 */
export function FeatureGrid({ t }: { t: Dictionary }) {
  const f = t.landing.face.features;
  const tiles: { key: keyof typeof f.tiles; href: string; icon: BrandIconName }[] = [
    { key: "buy", href: "/search?type=home", icon: "modern-house" },
    { key: "rent", href: "/search?type=rental", icon: "keys-home" },
    { key: "stays", href: "/stays", icon: "hotel" },
    { key: "invest", href: "/search?type=land", icon: "chart-growth" },
    { key: "assistant", href: "/assistant", icon: "bot" },
    { key: "wallet", href: "/wallet", icon: "wallet" },
    { key: "bookings", href: "/bookings", icon: "calendar-check" },
    { key: "messaging", href: "/messages", icon: "chat-duo" },
    { key: "inspections", href: "/inspections", icon: "home-search" },
    { key: "management", href: "/agents", icon: "doc-home" },
  ];

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-landing-features-title">
      <div className="nf-landing-split">
        <Reveal className="max-w-measure-lede">
          <span className="nf-overline text-[var(--nf-brand-secondary)]">{f.overline}</span>
          <h2 id="nf-landing-features-title" className="nf-h1 mt-row">
            {f.title}
          </h2>
          <p className="nf-lede mt-group">{f.body}</p>
          <Link href="/docs" className="nf-link-quiet nf-body-sm mt-heading inline-flex items-center gap-inline font-semibold">
            {f.learn}
            <UiIcon name="arrow-right" size={16} aria-hidden />
          </Link>
        </Reveal>
        <ul className="nf-landing-tiles">
          {tiles.map((tile, i) => (
            <Reveal as="li" key={tile.key} delay={i * 30}>
              <Link href={tile.href} className="nf-landing-tile" prefetch={false}>
                <span className="nf-landing-orb">
                  <BrandIcon name={tile.icon} fill />
                </span>
                <span>
                  <span className="nf-landing-tile-title block">{f.tiles[tile.key].title}</span>
                  <span className="nf-landing-tile-sub block">{f.tiles[tile.key].sub}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
