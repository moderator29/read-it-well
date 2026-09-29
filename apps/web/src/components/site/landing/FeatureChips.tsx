import type { Dictionary } from "@vallo/i18n/core";
import { Reveal } from "@/components/site/Reveal";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";

/**
 * The six-cell chip row from the fullpage render: one glass band, six glass
 * objects, a title and a one-line sub each. Statements about the product,
 * each of which is true today, none of which carries a number.
 *
 * THE SIX NOW SPEAK FOR BOTH SIDES, and every one of them points at a
 * shipped surface (content truth sweep, 19 September; the routes are named
 * in the dictionary beside the strings). The row used to read Verified
 * Listings, AI Powered, Secure Wallet, One Platform, Vallo Stays and
 * Property Management: three of those described the Property side only and
 * "One Platform / Every city. Everywhere." was a reach claim rather than a
 * capability. It reads buy and rent, the assistant, the wallet, bookings
 * and trips, Vallo Stays and messages instead. The composition, the glass
 * band and the six glass objects are untouched.
 */
export function FeatureChips({ t }: { t: Dictionary }) {
  const c = t.landing.face.chips;
  const cells: { key: keyof typeof c; icon: BrandIconName }[] = [
    { key: "verified", icon: "keys-home" },
    { key: "ai", icon: "bot" },
    { key: "wallet", icon: "wallet-secure" },
    { key: "one", icon: "calendar-check" },
    { key: "stays", icon: "hotel-star" },
    { key: "manage", icon: "chat-duo" },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="features" aria-label={c.one.title}>
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
