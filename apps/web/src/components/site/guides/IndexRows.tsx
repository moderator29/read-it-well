import Link from "next/link";
import { MotionReveal } from "@/components/motion/Reveal";
import { IconPlate } from "@/components/ui/IconPlate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import "./docs-type.css";

/** One door in an index: a line glyph, its name, one line, and what to expect behind it. */
export type IndexItem = {
  href: string;
  icon: UiIconName;
  title: string;
  /** The one line under the title (a clause or a sentence; two lines at most are shown). */
  line: string;
  /** A short trailing fact (a count, a reading time), tabular. */
  meta?: string;
  /** The row's language when it differs from the page's (English-only guides). */
  lang?: string;
};

/**
 * THE INDEX (reference 7086, Session 3 stage 9): the public menu's anatomy,
 * lifted onto the page. Each door is one Plate row: a round glyph plate, the
 * title in the display face, one line saying what is behind it, and a short
 * trailing fact. The rows sit inside ONE Card (one hairline); a row has no
 * edge of its own, only the Plate's hover and press wash, so an index of
 * twelve reads as one object and not twelve boxes.
 *
 * The same component answers the documentation contents, the help topics,
 * the guides and the policy links, so a stranger meets one index everywhere.
 * Two columns from 48rem, one below. The rows arrive 60ms apart on the shared
 * reveal (MotionReveal, six steps at most); under reduced motion, Calm and
 * Off they are simply there. Server rendered: no script of its own.
 *
 * `as="ol"` for a sequence (the documentation chapters), `ul` otherwise.
 */
export function IndexRows({
  items,
  label,
  as = "ul",
  className = "",
}: {
  items: readonly IndexItem[];
  label: string;
  as?: "ul" | "ol";
  className?: string;
}) {
  const List = as;
  return (
    <div className={`nf-panel nf-panel--card nf-index-card block ${className}`.trim()}>
      {/* A plain list with its role stated (the stylesheet removes the
          markers, and WebKit then drops a list's semantics unless it is told).
          Each row is its own reveal, `delay` 60ms apart and capped at the sixth
          step, which is the stagger's own rule; `MotionReveal` takes no role,
          so it cannot be the list itself. */}
      <List className="nf-index" aria-label={label} role="list">
        {items.map((item, index) => (
          <MotionReveal as="li" key={item.href} delay={index * 60}>
            <Link href={item.href} className="nf-index__row" lang={item.lang}>
              <IconPlate size="sm" shape="round" tone="brand" className="nf-index__plate">
                <UiIcon name={item.icon} size={20} />
              </IconPlate>
              <span className="nf-index__text">
                <span className="nf-index__title">{item.title}</span>
                <span className="nf-index__line">{item.line}</span>
              </span>
              {item.meta ? <span className="nf-index__meta nf-numeric">{item.meta}</span> : null}
            </Link>
          </MotionReveal>
        ))}
      </List>
    </div>
  );
}
