import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { LoopGate } from "@/components/motion/LoopGate";
import { MotionReveal } from "@/components/motion/Reveal";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BentoFx } from "./BentoFx";
import { SectionHead } from "./SectionHead";

/**
 * "Everything in one place": the bento (Track M, second pass).
 *
 * Seven doors into the product, in mixed sizes, each with one small live
 * scene built on the platform's own glass objects: the keys swing on their
 * tag by the house, the calendar turns, the assistant bobs while it types,
 * the Price Check report floats, the shield pops and a light
 * crosses it, two messages trade places behind the chat, the people float.
 * No line glyph illustrates anything here (the founder's rule for content
 * surfaces). The scenes are slow,
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
      return (
        <span className="nf-scene__obj nf-scene__obj--bob">
          <BrandIcon name="people-ring" size={88} />
        </span>
      );
  }
}
