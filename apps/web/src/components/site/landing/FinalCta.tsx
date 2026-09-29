import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";

/**
 * The last room (Track M): one line, one sentence, and two doors. The
 * primary is the hero's own words, so the page ends on the action it opened
 * with; the second makes the account. Since the clean pass (29 September)
 * the heading takes the landing's one section-title style and the panel
 * carries no glow of its own, and Explore Stays is not repeated here (the
 * search's Stay segment, the two worlds band and the header all lead there).
 */
export function FinalCta({ t }: { t: Dictionary }) {
  const c = t.landingRooms.close;
  const hero = t.landing.face.hero;
  return (
    <section className="nf-shell nf-room" data-chapter="close" aria-labelledby="nf-landing-close-title">
      <MotionReveal className="nf-close nf-depth-gate">
        <h2 id="nf-landing-close-title" className="nf-sec-title">
          {c.title}
        </h2>
        <p className="nf-sec-lede nf-close-body">{c.body}</p>
        <div className="nf-close-actions">
          <ButtonLink href="/search" variant="primary" size="md" trailingIcon="arrow-right">
            {hero.explore}
          </ButtonLink>
          <ButtonLink href="/start" variant="secondary" size="md">
            {c.join}
          </ButtonLink>
        </div>
      </MotionReveal>
    </section>
  );
}
