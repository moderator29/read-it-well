import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { Door } from "./doors";
import { SectionHead } from "./SectionHead";

/**
 * "Everything in one place": the bento (Track M, second pass).
 *
 * Seven doors into the product, in mixed sizes, each on the FLAT ICON PLATE
 * (spec section 4; section 16, Q3 as the lead decided it: the landing's
 * feature cards use the plate every other surface uses, so the platform
 * reads as one family, and the glass objects retire from light mode). The
 * plate sits top left and the words at the foot of the card, so a tall cell
 * is never half empty. The three front doors (rent and buy, stays, the
 * assistant) take the brand plate; the rest are neutral.
 *
 * EVERY DOOR IS HONEST (UIUX item 12): a door a stranger cannot open goes
 * to the sign-up door carrying the destination (`doors.ts`).
 *
 * STILL SINCE THE CLEAN PASS (29 September). The scenes used to loop (the
 * tag swung, the calendar turned, the assistant bobbed) and a desktop pointer
 * got a spotlight and a four degree tilt (BentoFx). Seven loops in one grid
 * were the busiest thing on the page, so the scenes are drawn at rest and
 * the card answers the pointer with the landing's one hover: a 2px lift and
 * a brighter edge.
 *
 * Every card is a real link to the surface it describes, and every sentence
 * on it describes what that surface does today.
 *
 * THE SIZES TILE EXACTLY. Four columns by three rows from 64rem is twelve
 * cells: two wide (2), two tall (2), two base (1) and the closing wide pair
 * (2 + 2). With the assistant as a base card and Around as a base card the
 * grid held ten, and the last row ended half empty beside the Guarantee.
 * The cards are in reading order (no `grid-auto-flow: dense`), so the tab
 * order runs row by row, and the same order tiles two columns too.
 */
type Glyph = "home" | "calendar-check" | "bot" | "chart-bar" | "shield-check" | "messages" | "compass";

export function Bento({ t, door }: { t: Dictionary; door: Door }) {
  const b = t.landingRooms.bento;
  const cards: { key: keyof typeof b.cards; href: string; glyph: Glyph; size: "wide" | "tall" | "base"; tone: "brand" | "neutral" }[] = [
    { key: "rent", href: "/search", glyph: "home", size: "wide", tone: "brand" },
    { key: "stays", href: "/stays", glyph: "calendar-check", size: "tall", tone: "brand" },
    { key: "ai", href: "/assistant", glyph: "bot", size: "tall", tone: "brand" },
    { key: "price", href: "/price", glyph: "chart-bar", size: "base", tone: "neutral" },
    { key: "messages", href: "/messages", glyph: "messages", size: "base", tone: "neutral" },
    { key: "agree", href: "/safety", glyph: "shield-check", size: "wide", tone: "neutral" },
    { key: "feed", href: "/around", glyph: "compass", size: "wide", tone: "neutral" },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="bento" aria-labelledby="nf-landing-bento-title">
      <SectionHead id="nf-landing-bento-title" eyebrow={b.overline} title={b.title} lede={b.body} align="center" />
      <div className="nf-bento-gate">
        <MotionReveal as="ul" stagger className="nf-bento">
          {cards.map((c) => (
            <li key={c.key} className={`nf-bento__cell nf-bento__cell--${c.size}`}>
              <Link href={door(c.href)} prefetch={false} className="nf-bento__card">
                <IconPlate size="md" tone={c.tone} className="nf-bento__plate">
                  <UiIcon name={c.glyph} size={ICON_PLATE_GLYPH.md} />
                </IconPlate>
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
