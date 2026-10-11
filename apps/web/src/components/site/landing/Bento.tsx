import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { Icon3D } from "@/components/ui/Icon3D";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Door } from "./doors";
import { SectionHead } from "./SectionHead";
import { BENTO_OBJECTS, LANDING_OBJECT_SIZE } from "./landing-objects";

/**
 * "Everything in one place": the bento (Track M, second pass).
 *
 * Seven doors into the product, in mixed sizes, each with ONE OF THE
 * FOUNDER'S 3D OBJECTS (30 September; `landing-objects.ts`), all at one
 * size, in place of the flat plates. The object sits top left and the words
 * at the foot of the card, so a tall cell is never half empty.
 *
 * RESTORED ON 7 OCTOBER at the founder's request ("my landing page is even
 * still the same, no upgrade"), straight after the hero, so his 3D art is
 * the first thing under the fold. The cards float in one after another as
 * the grid enters the viewport (the shared stagger); a desktop pointer
 * lifts a card 4px with its shadow and lifts and turns its object; a touch
 * presses the card in (landing-3d.css, "the 3D pass"). Under 40rem the
 * bento is a swipe row, so seven doors cost one card's height on a phone.
 *
 * EVERY DOOR IS HONEST (UIUX item 12): a door a stranger cannot open goes
 * to the sign-up door carrying the destination (`doors.ts`). Around is left
 * out when the social switch is off, as the platform band and the app's
 * navigation drop it.
 *
 * Every card is a real link to the surface it describes, and every sentence
 * on it describes what that surface does today.
 *
 * THE SIZES TILE EXACTLY. Four columns by three rows from 64rem is twelve
 * cells: two wide (2), two tall (2), two base (1) and the closing wide pair
 * (2 + 2); without Around the agreements card takes the whole last row.
 * The cards are in reading order (no `grid-auto-flow: dense`), so the tab
 * order runs row by row, and the same order tiles two columns too.
 */
export function Bento({ t, door, social = true }: { t: Dictionary; door: Door; social?: boolean }) {
  const b = t.landingRooms.bento;
  const all: { key: keyof typeof b.cards & keyof typeof BENTO_OBJECTS; href: string; size: "wide" | "tall" | "base" | "full" }[] = [
    { key: "rent", href: "/search", size: "wide" },
    { key: "stays", href: "/stays", size: "tall" },
    { key: "ai", href: "/assistant", size: "tall" },
    { key: "price", href: "/price", size: "base" },
    { key: "messages", href: "/messages", size: "base" },
    { key: "agree", href: "/safety", size: social ? "wide" : "full" },
    { key: "feed", href: "/around", size: "wide" },
  ];
  const cards = all.filter((c) => social || c.key !== "feed");
  return (
    <section className="nf-shell nf-room" data-chapter="bento" aria-labelledby="nf-landing-bento-title">
      <SectionHead id="nf-landing-bento-title" eyebrow={b.overline} title={b.title} lede={b.body} align="center" />
      <div className="nf-bento-gate">
        <MotionReveal as="ul" stagger className="nf-bento">
          {cards.map((c) => (
            <li key={c.key} className={`nf-bento__cell nf-bento__cell--${c.size}`}>
              <Link href={door(c.href)} prefetch={false} className="nf-bento__card">
                <span className="nf-obj nf-bento__obj">
                  <Icon3D name={BENTO_OBJECTS[c.key]} size={LANDING_OBJECT_SIZE.bento} />
                </span>
                {(() => {
                  const card = b.cards[c.key];
                  const chips = "chips" in card ? card.chips : null;
                  return chips && c.size === "tall" ? (
                    <span className="nf-bento__chips" aria-hidden="true">
                      {chips.map((chip) => (
                        <span key={chip} className="nf-bento__chip">
                          {chip}
                        </span>
                      ))}
                    </span>
                  ) : null;
                })()}
                <span className="nf-bento__text">
                  <span className="nf-bento__title">
                    {b.cards[c.key].title}
                    <UiIcon name="arrow-right" size={16} className="nf-bento__arrow" />
                  </span>
                  <span className="nf-bento__body">{b.cards[c.key].body}</span>
                </span>
              </Link>
            </li>
          ))}
        </MotionReveal>
      </div>
    </section>
  );
}
