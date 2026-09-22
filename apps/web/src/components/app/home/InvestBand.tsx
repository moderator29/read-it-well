import Image from "next/image";
import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { InvestFeature } from "./markets";

/**
 * The investment band, to the founder's target render: the eyebrow, the
 * two-line headline with the second line in brand blue, the sentence under
 * it, the primary action, and the photograph on the right carrying the
 * Verified mark.
 *
 * THE PHOTOGRAPH IS A LISTING, NOT A MOOD PLATE. The render's Verified pill
 * is a trust mark, and rule 12 says a trust mark only ever means a human was
 * checked, so the band renders only when the catalogue holds a for-sale row
 * with a photograph: that row's picture fills the frame, that row's verified
 * state decides the pill, and tapping the picture opens it. With nothing for
 * sale the whole band is absent, because an investment offer with no property
 * behind it is a picture of a feature.
 *
 * The action goes to the for-sale market, which is what an investment in
 * property is on this platform today. No yield, no projection and no return
 * is promised anywhere in the copy, because none of that is modelled.
 */
export function InvestBand({ t, feature }: { t: Dictionary; feature: InvestFeature }) {
  const copy = t.home.invest;

  return (
    <section className="nf-glass nf-glass--card nf-home__invest" aria-labelledby="home-invest-title">
      <div className="nf-home__invest-body">
        <p className="nf-home__invest-eyebrow">{copy.eyebrow}</p>
        <h2 id="home-invest-title" className="nf-home__invest-title">
          {copy.titleLead}
          <span className="nf-home__invest-accent">{copy.titleAccent}</span>
        </h2>
        <p className="nf-home__invest-text">{copy.body}</p>
        <Link href="/search?market=buy" className="nf-btn nf-btn--primary nf-btn--sm nf-tap">
          {copy.action}
          <UiIcon name="arrow-right" size={16} />
        </Link>
      </div>

      <Link href={feature.href} className="nf-home__invest-media" aria-label={feature.title}>
        <Image src={feature.photo} alt="" fill sizes="(max-width: 640px) 60vw, 380px" />
        {feature.verified && (
          <span className="nf-home__invest-mark">
            <UiIcon name="verified" size={12} />
            {t.common.verified}
          </span>
        )}
      </Link>
    </section>
  );
}
