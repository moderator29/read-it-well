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
 * `[[phrase]]` in the title takes the brand ink; a translation without
 * brackets renders plain.
 */
export function SectionHead({
  id,
  eyebrow,
  title,
  lede,
  align = "start",
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "start" | "center";
  children?: ReactNode;
  className?: string;
}) {
  const parts = title
    .split(/\[\[(.+?)\]\]/g)
    .map((text, i) => ({ text: text.trim(), lit: i % 2 === 1 }))
    .filter((part) => part.text);
  return (
    <MotionReveal className={`nf-sec-head nf-depth-gate nf-sec-head--${align} ${className ?? ""}`.trim()}>
      {eyebrow && <span className="nf-eyebrow">{eyebrow}</span>}
      <h2 id={id} className="nf-sec-title">
        {parts.map((part, i) => (
          <Fragment key={`${i}-${part.text}`}>
            {i > 0 ? " " : null}
            {part.lit ? <span className="nf-landing-hl">{part.text}</span> : part.text}
          </Fragment>
        ))}
      </h2>
      {lede && <p className="nf-sec-lede">{lede}</p>}
      {children}
    </MotionReveal>
  );
}
