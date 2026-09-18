import type { Dictionary } from "@vallo/i18n";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The six-cell chip row from the fullpage render: one glass band, six glass
 * objects, a title and a one-line sub each. Statements about the product,
 * each of which is true today, none of which carries a number.
 */
export function FeatureChips({ t }: { t: Dictionary }) {
  const c = t.landing.face.chips;
  const cells: { key: keyof typeof c; icon: BrandIconName }[] = [
    { key: "verified", icon: "seal-check" },
    { key: "ai", icon: "bot" },
    { key: "wallet", icon: "wallet-secure" },
    { key: "one", icon: "globe-pin" },
    { key: "stays", icon: "hotel-star" },
    { key: "manage", icon: "doc-home" },
  ];
  return (
    <section className="nf-shell pb-section" aria-label={c.one.title}>
      <Reveal>
        <ul className="nf-landing-chiprow">
          {cells.map((cell) => (
            <li key={cell.key} className="nf-landing-chipcell">
              <span className="nf-landing-orb nf-landing-orb--lg">
                <BrandIcon name={cell.icon} fill />
              </span>
              <span>
                <span className="nf-landing-tile-title block">{c[cell.key].title}</span>
                <span className="nf-landing-tile-sub mt-inline-tight block">{c[cell.key].sub}</span>
              </span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
