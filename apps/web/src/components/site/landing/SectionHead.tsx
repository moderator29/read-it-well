import { Fragment, type ReactNode } from "react";
import { MotionReveal } from "@/components/motion/Reveal";

/**
 * THE LANDING'S ONE SECTION HEAD: eyebrow, heading, lede, in that order, on
 * every room of the page, in one type style.
 *
 * The head rises once, the first time it is on screen (MotionReveal), and
 * the eyebrow's hairline draws in with it (landing-rooms.css keys it on
 * `data-seen`). The heading used to arrive word by word out of depth, with a
 * blur on every word; on a phone scrolling past a dozen heads that was the
 * heaviest paint on the page, so since the clean pass (29 September) only
 * the hero's headline does that, and a section head simply arrives. With
 * scripts off, or under reduced motion, it is simply there.
 *
 * ONE HEAD RULE (UIUX item 10): centred only above a full-width grid (the
 * hands-on deck, the journey, the bento, the two worlds), start-aligned in
 * every split room and aligned to the top of its content. The eyebrow is
 * the shared section label (`.nf-section-label`, 11px caps), the title at
 * most 20ch at 600, the lede at most 52ch; head to content is 24px on a
 * phone and 32 on a desktop (landing-rooms.css, "THE UNIFIED PASS").
 *
 * `[[phrase]]` in the title takes the brand ink; a translation without
 * brackets renders plain.
 *
 * `flourish` underlines the title's last word in the warm spark, a short
 * orange stroke that draws in once (spec section 18). Two heads on the page
 * carry it and no more: it is a spark, not a style.
 */
export function SectionHead({
  id,
  eyebrow,
  title,
  lede,
  align = "start",
  flourish = false,
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "start" | "center";
  /** Underline the title's last word in the warm spark. */
  flourish?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const parts = title
    .split(/\[\[(.+?)\]\]/g)
    .map((text, i) => ({ text: text.trim(), lit: i % 2 === 1 }))
    .filter((part) => part.text);
  return (
    <MotionReveal className={`nf-sec-head nf-depth-gate nf-sec-head--${align} ${className ?? ""}`.trim()}>
      {eyebrow && <span className="nf-section-label nf-eyebrow">{eyebrow}</span>}
      <h2 id={id} className="nf-sec-title">
        {parts.map((part, i) => (
          <Fragment key={`${i}-${part.text}`}>
            {i > 0 ? " " : null}
            {part.lit ? (
              <span className="nf-landing-hl">{part.text}</span>
            ) : flourish && i === parts.length - 1 ? (
              <SparkLast text={part.text} />
            ) : (
              part.text
            )}
          </Fragment>
        ))}
      </h2>
      {lede && <p className="nf-sec-lede">{lede}</p>}
      {children}
    </MotionReveal>
  );
}

/** The text with its last word wrapped for the spark stroke. */
function SparkLast({ text }: { text: string }) {
  const at = text.lastIndexOf(" ");
  const head = at < 0 ? "" : text.slice(0, at + 1);
  const last = at < 0 ? text : text.slice(at + 1);
  return (
    <>
      {head}
      <span className="nf-spark-flourish">{last}</span>
    </>
  );
}
