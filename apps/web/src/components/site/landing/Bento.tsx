import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
import { LoopGate } from "@/components/motion/LoopGate";
import { MotionReveal } from "@/components/motion/Reveal";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BentoFx } from "./BentoFx";
import { SectionHead } from "./SectionHead";

/**
 * "Everything in one place": the bento (Track M, second pass).
 *
 * Seven doors into the product, in mixed sizes, each with one small live
 * scene drawn in CSS: the price tag swings, the calendar turns a page, the
 * assistant types, the Price Check bars settle, the shield draws its tick,
 * two messages trade places, the feed moves up a card. The scenes are slow,
 * run only while the grid is on screen (LoopGate), and stop entirely under
 * reduced motion and data saver.
 *
 * On a desktop pointer each card also carries a spotlight that follows the
 * cursor and a tilt of at most four degrees (BentoFx, a few lines of
 * pointer code). Touch, reduced motion and data saver get neither.
 *
 * Every card is a real link to the surface it describes, and every sentence
 * on it describes what that surface does today.
 */
type Scene = "tag" | "calendar" | "typing" | "bars" | "shield" | "messages" | "feed";

export function Bento({ t }: { t: Dictionary }) {
  const b = t.landingRooms.bento;
  const cards: { key: keyof typeof b.cards; href: string; scene: Scene; size: "wide" | "tall" | "base" }[] = [
    { key: "rent", href: "/search", scene: "tag", size: "wide" },
    { key: "stays", href: "/stays", scene: "calendar", size: "tall" },
    { key: "ai", href: "/assistant", scene: "typing", size: "base" },
    { key: "price", href: "/price", scene: "bars", size: "base" },
    { key: "agree", href: "/safety", scene: "shield", size: "wide" },
    { key: "messages", href: "/messages", scene: "messages", size: "base" },
    { key: "feed", href: "/around", scene: "feed", size: "base" },
  ];
  return (
    <section className="nf-shell nf-room" data-chapter="bento" aria-labelledby="nf-landing-bento-title">
      <SectionHead id="nf-landing-bento-title" eyebrow={b.overline} title={b.title} lede={b.body} align="center" />
      <LoopGate className="nf-bento-gate">
        <BentoFx>
          <MotionReveal as="ul" stagger className="nf-bento">
            {cards.map((c) => (
              <li key={c.key} className={`nf-bento__cell nf-bento__cell--${c.size}`}>
                <Link href={c.href} prefetch={false} className="nf-bento__card">
                  <span className="nf-bento__spot" aria-hidden="true" />
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
        </BentoFx>
      </LoopGate>
    </section>
  );
}

function SceneArt({ scene }: { scene: Scene }) {
  switch (scene) {
    case "tag":
      return (
        <>
          <span className="nf-scene__house">
            <UiIcon name="house" size={40} />
          </span>
          <span className="nf-scene__tag">
            <UiIcon name="price-tag" size={24} />
          </span>
        </>
      );
    case "calendar":
      return (
        <span className="nf-scene__cal">
          <span className="nf-scene__cal-top" />
          <span className="nf-scene__cal-page nf-scene__cal-page--under" />
          <span className="nf-scene__cal-page nf-scene__cal-page--flip" />
          <span className="nf-scene__cal-grid">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} data-on={i === 6 || i === 7 ? "true" : undefined} />
            ))}
          </span>
        </span>
      );
    case "typing":
      return (
        <span className="nf-scene__chat">
          <span className="nf-scene__q" />
          <span className="nf-scene__dots">
            <i />
            <i />
            <i />
          </span>
        </span>
      );
    case "bars":
      return (
        <span className="nf-scene__bars">
          {[0.55, 0.8, 0.68, 0.92, 0.6].map((h, i) => (
            <i key={i} style={{ "--h": h, "--bar-i": i } as React.CSSProperties} />
          ))}
        </span>
      );
    case "shield":
      return (
        <span className="nf-scene__shield">
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.9 19.2 6v5.3c0 4.3-2.9 8-7.2 9.6-4.3-1.6-7.2-5.3-7.2-9.6V6Z" />
            <g className="nf-scene__tick">
              <path d="m8.7 11.8 2.3 2.3 4.3-4.4" />
            </g>
          </svg>
        </span>
      );
    case "messages":
      return (
        <span className="nf-scene__msgs">
          <span className="nf-scene__msg nf-scene__msg--a" />
          <span className="nf-scene__msg nf-scene__msg--b" />
        </span>
      );
    case "feed":
      return (
        <span className="nf-scene__feed">
          <i />
          <i />
          <i />
        </span>
      );
  }
}
