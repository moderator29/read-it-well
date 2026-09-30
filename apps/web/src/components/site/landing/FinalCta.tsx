import type { Dictionary } from "@vallo/i18n/core";
import { ButtonLink } from "@/components/ui/Button";
import { MotionReveal } from "@/components/motion/Reveal";
import { LogoMark, LogoWordmark } from "@/design-system/brand/Logo";
import { EdgeLap } from "@/components/site/EdgeLap";
import { ObjectField } from "./ObjectField";
import { CLOSE_OBJECTS } from "./landing-objects";

/**
 * THE LAST ROOM: ONE BIG CARD (the founder's reference 41, 29 September
 * 2026). On a soft brand wash with the hero's faint grid, a large rounded
 * card (white on paper, the night card at night) holds the logo on its
 * plate beside the wordmark, the closing headline, one line of copy, and two
 * full-width doors: the account (primary) and Sign in (outline).
 *
 * BOTH DOORS ARE WHAT THEY SAY. "Create your account" goes to `/start`,
 * which hands a stranger to first run and on to sign up; "Sign in" goes to
 * sign in. Neither promises the catalogue (UIUX item 12).
 *
 * The logo plate carries the edge lap, the logo pill's moving light, and
 * three of the founder's 3D objects float at the card's corners.
 */
export function FinalCta({ t }: { t: Dictionary }) {
  const c = t.landingRooms.close;
  return (
    <section className="nf-close-room" data-chapter="close" aria-labelledby="nf-landing-close-title">
      <div className="nf-hero-grid nf-close-room__grid" aria-hidden="true" />
      <div className="nf-shell nf-close-room__stage">
        {/* The keys, the home and the record, floating at the card's
            corners (ObjectField; still under reduced motion, Calm and Off). */}
        <ObjectField objects={CLOSE_OBJECTS} className="nf-o3--close" pointer />
        <MotionReveal className="nf-close">
          <div className="nf-close__brand">
            <EdgeLap as="span" className="nf-close__plate" aria-hidden="true">
              <LogoMark size={34} />
            </EdgeLap>
            <span className="nf-close__word" aria-hidden="true">
              <LogoWordmark width={758} height={167} sizes="140px" style={{ height: 24, width: "auto" }} />
            </span>
          </div>
          <h2 id="nf-landing-close-title" className="nf-close__title">
            {c.title}
          </h2>
          <p className="nf-close__body">{c.body}</p>
          <div className="nf-close__actions">
            <ButtonLink href="/start" variant="primary" size="lg" full>
              {c.join}
            </ButtonLink>
            <ButtonLink href="/sign-in" variant="secondary" size="lg" full>
              {c.signIn}
            </ButtonLink>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
