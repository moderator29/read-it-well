"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import "@/app/css/ported.css";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";

/**
 * UNFOLD: A GROUP OF DISCLOSURES THAT OPEN IN PLACE.
 *
 * Ported from the founder's component library (docs/design/COMPONENT_LIBRARY.md,
 * "Unfold accordion"), built Vallo-native in CSS with no animation library.
 *
 * WHAT MAY GO BEHIND IT: the itemised cost breakdown's detail rows, agreement
 * clauses, help-centre answers, a listing's amenity groups, admin case history,
 * a receipt's line items. Things a person reads when they want to, after they
 * have already understood the page.
 *
 * WHAT MAY NEVER GO BEHIND IT: price, fees, trust facts and money state. A
 * person must never have to open a panel to learn what something costs, whether
 * a listing is verified, or where their money is. If a fact decides whether to
 * act at all, it stays on the page (the `Disclosure` file states the same rule
 * for the sheet form). This component cannot enforce that, so call sites do:
 * review any Unfold whose items mention an amount, a fee, a status or a badge.
 * A summary line that always shows the total (and the fees that compose it) is
 * the right way to use a breakdown; the Unfold holds only the extra detail.
 *
 * ARIA AND KEYBOARD. Each item is a heading containing one button
 * (`aria-expanded`, `aria-controls`), and each panel is a labelled region. Up
 * and Down move between triggers, Home and End jump to the first and last, and
 * Enter or Space toggle (a native button gives that). A closed panel is `inert`,
 * so nothing inside it is reachable by Tab or read out while it is closed.
 *
 * MOTION, AND WHY IT IS CSS. The founder's `unfold-accordion.tsx` springs the
 * panel's height with framer-motion and unmounts the content when closed. A
 * disclosure is a known track with a known end, so by the platform's split
 * (D34, D39) it is CSS, and it has a second reason: framer's `m` elements show
 * nothing but their first frame until the lazily loaded features arrive, which
 * would leave a panel that opened and stayed invisible. Here open and closed
 * are React state and a data attribute, so an accordion works from its first
 * frame. The panel grows with the one disclosure motion the product already has
 * (`.nf-disclosure` in list-group.css): a `grid-template-rows` reveal and a
 * fade over `--nf-duration-base` on the standard curve, the content lifting 8px
 * as it arrives, and the chevron turning on the same duration, so title,
 * chevron and content read as one motion. Closed content is `inert` and
 * `visibility: hidden` once the fade ends, so it is out of the tab order and
 * the accessibility tree. The height reveal is the single deliberate layout
 * animation here, the same compromise `.nf-disclosure` makes, so every
 * disclosure on the platform opens alike. Reduced motion, Calm and Off make it
 * instant, because the duration tokens collapse.
 *
 * MODES. `multiple` lets several items stay open; the default is one at a time.
 * Controlled with `value` plus `onValueChange`, or uncontrolled with
 * `defaultValue`. `value` is always the list of open item ids.
 *
 * COPY is the caller's; this component has none of its own. Headings are real
 * headings: pass `headingLevel` to match the page outline.
 */

export type UnfoldItem = {
  id: string;
  /** The trigger's label. */
  title: ReactNode;
  /** A quiet second line under the title (a count, one clarifying word). */
  hint?: ReactNode;
  /** An optional leading glyph. */
  icon?: UiIconName;
  /** What opens. Never price, fees, trust facts or money state: see above. */
  content: ReactNode;
  disabled?: boolean;
};

export function Unfold({
  items,
  multiple = false,
  value,
  defaultValue,
  onValueChange,
  headingLevel = 3,
  className,
  "data-testid": testId,
}: {
  items: readonly UnfoldItem[];
  multiple?: boolean;
  /** Controlled: the ids that are open. */
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (open: string[]) => void;
  /** The heading level wrapping each trigger, 2 to 6. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
  "data-testid"?: string;
}) {
  const base = useId();
  const [inner, setInner] = useState<string[]>(() => [...(defaultValue ?? [])]);
  const open = value ?? inner;
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const Heading = `h${headingLevel}` as const;

  const toggle = useCallback(
    (id: string) => {
      const isOpen = open.includes(id);
      const next = isOpen ? open.filter((x) => x !== id) : multiple ? [...open, id] : [id];
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
    [open, multiple, value, onValueChange],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabled = items.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);
    const at = enabled.indexOf(index);
    let target: number | undefined;
    if (e.key === "ArrowDown") target = enabled[(at + 1) % enabled.length];
    else if (e.key === "ArrowUp") target = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (e.key === "Home") target = enabled[0];
    else if (e.key === "End") target = enabled[enabled.length - 1];
    if (target === undefined) return;
    e.preventDefault();
    triggers.current[target]?.focus();
  };

  return (
    <div className={cn("nf-unfold", className)} data-testid={testId}>
      {items.map((item, index) => {
        const isOpen = open.includes(item.id);
        const triggerId = `${base}-t-${item.id}`;
        const panelId = `${base}-p-${item.id}`;
        return (
          <div key={item.id} className="nf-unfold__item" data-open={isOpen || undefined}>
            <Heading className="nf-unfold__heading">
              <button
                ref={(el) => {
                  triggers.current[index] = el;
                }}
                id={triggerId}
                type="button"
                className="nf-unfold__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                disabled={item.disabled}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
              >
                {item.icon ? <UiIcon name={item.icon} size={20} className="nf-unfold__glyph" /> : null}
                <span className="nf-unfold__text">
                  <span className="nf-unfold__title">{item.title}</span>
                  {item.hint ? <span className="nf-unfold__hint">{item.hint}</span> : null}
                </span>
                <UiIcon name="chevron-down" size={20} className="nf-unfold__chevron" />
              </button>
            </Heading>
            <div id={panelId} role="region" aria-labelledby={triggerId} className="nf-unfold__panel">
              <div className="nf-unfold__clip" inert={!isOpen}>
                <div className="nf-unfold__content">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
