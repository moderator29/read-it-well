import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { MotionReveal } from "@/components/motion/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SectionHead } from "./SectionHead";

/**
 * "Everything in one place": the bento (Track M, second pass).
 *
 * Seven doors into the product, in mixed sizes, each with one still scene
 * built on the platform's own glass objects: the house and its key tag, the
 * calendar, the assistant with its typing dots, the Price Check report, the
 * shield, two messages behind the chat, the map pin. No line glyph
 * illustrates anything here (the founder's rule for content surfaces).
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
type Scene = "tag" | "calendar" | "typing" | "bars" | "shield" | "messages" | "feed";

export function Bento({ t }: { t: Dictionary }) {
  const b = t.landingRooms.bento;
  const cards: { key: keyof typeof b.cards; href: string; scene: Scene; size: "wide" | "tall" | "base" }[] = [
    { key: "rent", href: "/search", scene: "tag", size: "wide" },
    { key: "stays", href: "/stays", scene: "calendar", size: "tall" },
    { key: "ai", href: "/assistant", scene: "typing", size: "tall" },
    { key: "price", href: "/price", scene: "bars", size: "base" },
    { key: "messages", href: "/messages", scene: "messages", size: "base" },
    { key: "agree", href: "/safety", scene: "shield", size: "wide" },
    { key: "feed", href: "/around", scene: "feed", size: "wide" },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="bento" aria-labelledby="nf-landing-bento-title">
      <SectionHead id="nf-landing-bento-title" eyebrow={b.overline} title={b.title} lede={b.body} align="center" />
      <div className="nf-bento-gate">
        <MotionReveal as="ul" stagger className="nf-bento">
          {cards.map((c) => (
            <li key={c.key} className={`nf-bento__cell nf-bento__cell--${c.size}`}>
              <Link href={c.href} prefetch={false} className="nf-bento__card">
                <span className={`nf-scene nf-scene--${c.scene}`} aria-hidden="true">
                  <SceneArt scene={c.scene} />
                </span>
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

function SceneArt({ scene }: { scene: Scene }) {
  switch (scene) {
    case "tag":
      return (
        <>
          <span className="nf-scene__obj">
            <BrandIcon name="modern-house" size={96} />
          </span>
          <span className="nf-scene__tag">
            <BrandIcon name="keys-tag" size={48} />
          </span>
        </>
      );
    case "calendar":
      return (
        <span className="nf-scene__obj nf-scene__obj--flip">
          <BrandIcon name="calendar-check" size={112} />
        </span>
      );
    case "typing":
      return (
        <>
          <span className="nf-scene__obj nf-scene__obj--bob">
            <BrandIcon name="bot" size={80} />
          </span>
          <span className="nf-scene__dots">
            <i />
            <i />
            <i />
          </span>
        </>
      );
    case "bars":
      return (
        <span className="nf-scene__obj nf-scene__obj--bob">
          <BrandIcon name="report-stats" size={88} />
        </span>
      );
    case "shield":
      return (
        <span className="nf-scene__obj nf-scene__obj--pop nf-scene__gleam">
          <BrandIcon name="shield-check" size={96} />
        </span>
      );
    case "messages":
      return (
        <>
          <span className="nf-scene__msgs">
            <span className="nf-scene__msg nf-scene__msg--a" />
            <span className="nf-scene__msg nf-scene__msg--b" />
          </span>
          <span className="nf-scene__obj nf-scene__obj--front">
            <BrandIcon name="chat-duo" size={80} />
          </span>
        </>
      );
    case "feed":
      /* `map-spot`, not `people-ring`: the ring assets draw a small, faint
         object inside a glowing ring and read as missing beside the
         full-size objects on the other cards. Around is places near you. */
      return (
        <span className="nf-scene__obj nf-scene__obj--bob">
          <BrandIcon name="map-spot" size={88} />
        </span>
      );
  }
}
