import { Fragment, type ReactNode } from "react";
import { DepthWords, wordCount } from "@/components/motion/DepthWords";
import { MotionReveal } from "@/components/motion/Reveal";

/**
 * THE LANDING'S ONE SECTION HEAD (Track M, second pass): eyebrow, heading,
 * lede, in that order, on every room of the page.
 *
 * The eyebrow's hairline draws in from the left, and the heading arrives
 * word by word out of depth (the shared DepthWords), both on the first time
 * the head is on screen rather than on page load, so a heading three screens
 * down is not over before anybody reaches it (landing-rooms.css keys them on
 * MotionReveal's `data-seen`). With scripts off, or under reduced motion,
 * the words are simply there.
 *
 * `[[phrase]]` in the title takes the brand ink, as the community heading
 * has always set it; a translation without brackets renders plain.
 */
export function SectionHead({
  id,
  eyebrow,
  title,
  lede,
  align = "start",
  size = "h1",
  children,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "start" | "center";
  size?: "h1" | "display";
  children?: ReactNode;
  className?: string;
}) {
  const parts = title
    .split(/\[\[(.+?)\]\]/g)
    .map((text, i) => ({ text: text.trim(), lit: i % 2 === 1 }))
    .filter((part) => part.text);
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((n, p) => n + wordCount(p.text), 0));
  return (
    <MotionReveal className={`nf-sec-head nf-depth-gate nf-sec-head--${align} ${className ?? ""}`.trim()}>
      {eyebrow && <span className="nf-eyebrow">{eyebrow}</span>}
      <h2 id={id} className={size === "display" ? "nf-sec-title nf-sec-title--display" : "nf-sec-title"}>
        {parts.map((part, i) => {
          const words = <DepthWords text={part.text} start={starts[i] ?? 0} />;
          return (
            <Fragment key={`${i}-${part.text}`}>
              {i > 0 ? " " : null}
              {part.lit ? <span className="nf-landing-hl">{words}</span> : words}
            </Fragment>
          );
        })}
      </h2>
      {lede && <p className="nf-sec-lede">{lede}</p>}
      {children}
    </MotionReveal>
  );
}
