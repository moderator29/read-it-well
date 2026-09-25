import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";
import { DepthWords } from "@/components/motion/DepthWords";
import { Sweep } from "./Sweep";

/**
 * The last room (Track M): one line, one sentence, and the three doors the
 * page has been pointing at. The two explore links are the hero's own words,
 * so the page ends on the promise it opened with.
 */
export function FinalCta({ t }: { t: Dictionary }) {
  const c = t.landingRooms.close;
  const hero = t.landing.face.hero;
  return (
    <section className="nf-shell nf-room" data-chapter="close" aria-labelledby="nf-landing-close-title">
      <MotionReveal className="nf-close nf-depth-gate">
        <div className="nf-close-glow" aria-hidden="true" />
        <h2 id="nf-landing-close-title" className="nf-close-title">
          <DepthWords text={c.title} />
        </h2>
        <p className="nf-lede nf-close-body">{c.body}</p>
        <div className="nf-close-actions">
          <ButtonLink href="/search" variant="primary" size="md" trailingIcon="arrow-right" className="nf-magnetic">
            <Sweep />
            {hero.explore}
          </ButtonLink>
          <ButtonLink href="/stays" variant="secondary" size="md">
            {hero.stays}
          </ButtonLink>
          <ButtonLink href="/start" variant="ghost" size="md">
            {c.join}
          </ButtonLink>
        </div>
      </MotionReveal>
    </section>
  );
}
