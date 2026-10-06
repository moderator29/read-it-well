import type { ReactNode } from "react";
import { CountUp } from "@/components/motion/CountUp";
import { HeroFigure } from "@/components/ui/HeroFigure";
import { ListGroup, ListRow } from "@/components/ui/ListGroup";

/**
 * THE WORKSPACE HOME'S FIGURE HERO (reference 7033, north star section 10 G
 * and H; Session 3, 6 October 2026). Sits inside the host's and the agent's
 * hero band, above the count cards, and answers "what needs me" before
 * anything else on the screen does.
 *
 *   count   how many things are waiting on this person today. It is the SUM
 *           OF THE COUNT CARDS beneath it that were read, and only those: a
 *           card whose source failed is left out of the cards and out of the
 *           sum, so the figure always decomposes into what the reader can
 *           see and tap. The caller passes null when no queue could be read
 *           at all, and the figure is not drawn rather than drawn as 0.
 *   next    the one thing to do first: the oldest item still waiting. It
 *           leaves the "needs attention" list beneath, so nothing is listed
 *           twice. Absent when nothing waits.
 *
 * The figure counts up once on arrival (motion 4, CountUp, eager) and is set
 * in the shared HeroFigure material, so it takes the band's night palette.
 * Server-safe: CountUp is the only client leaf.
 */
export type NextAction = {
  href: string;
  title: ReactNode;
  sub?: ReactNode;
  leading: ReactNode;
  status?: ReactNode;
};

export function TodayHero({
  caption,
  count,
  busy,
  idle,
  next,
  tag,
}: {
  /** "Needs you today". */
  caption: string;
  /** Null when no queue behind the figure could be read. */
  count: number | null;
  /** The quiet line when something waits ("Each count links to the list it came from."). */
  busy: string;
  /** The quiet line when nothing does ("Nothing needs you today."). */
  idle: string;
  next?: NextAction | null;
  tag: string;
}) {
  if (count === null) return null;
  return (
    <div className="nf-today-hero">
      <HeroFigure caption={caption} sub={count > 0 ? busy : idle}>
        <CountUp value={count} tag={tag} eager />
      </HeroFigure>
      {next ? (
        <ListGroup bare className="nf-today-hero__next">
          <ListRow
            href={next.href}
            leading={next.leading}
            title={next.title}
            sub={next.sub}
            status={next.status}
            chevron={next.status == null}
          />
        </ListGroup>
      ) : null}
    </div>
  );
}
