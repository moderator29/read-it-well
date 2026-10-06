"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import "@/app/css/ported.css";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { IconPlate, type IconPlateTone } from "@/components/ui/IconPlate";
import { cn } from "@/lib/cn";
import { SPRING_GENTLE, springFor } from "./ported-motion";

/**
 * LIVE ISLAND: THE DYNAMIC ISLAND AS A STATUS SURFACE.
 *
 * Ported from the founder's component library (docs/design/COMPONENT_LIBRARY.md,
 * "Dynamic Island"). The reference uses the pattern as a profile card. Vallo does
 * not: here it is a surface for LIVE STATE THAT OUTLIVES A SCREEN, one that stays
 * put while a person navigates somewhere else.
 *
 * WHAT BELONGS IN IT (the library's table):
 *   a payment processing   the real steps, ticking as each one completes
 *   escrow awaiting        what is still needed
 *   an upload running      progress, with a cancel
 *   an assistant answer    the thinking state
 *   a booking expiring     the real clock
 *
 * THE HONESTY RULES. This component draws what it is TOLD and decides nothing:
 *   - `steps` carry their own state. A step is `done` only when the caller says
 *     the thing actually finished; there is no timer in here (MOTION_SYSTEM:
 *     "Processing steps ... tick when they actually complete, never on a timer").
 *   - `progress` is a real fraction, shown on a determinate bar. If it is not
 *     known, omit it: there is no indeterminate bar and no spinner, because
 *     nothing here may imply progress that is not happening.
 *   - Nothing is invented. No default copy, no sample steps, no placeholder
 *     figures. A money state is rendered from the caller's own `Money` or
 *     `Amount` element in `meta`, never as text this component writes.
 *
 * IT NEVER COVERS THE DOCK. `placement="top"` (default) sits below the header.
 * `placement="bottom"` sits above the floating dock using the same clearance the
 * toast host uses (`--nf-tabbar-clearance`), and on a wide screen, where the dock
 * is a side rail, it sits at the bottom edge. It is layered under toasts and
 * sheets (`--nf-z-overlay`), so a confirmation can still arrive over it.
 *
 * SHAPE AND MATERIAL. An Island: radius 26, the sheet's glass panel (blur plus
 * one edge), both themes. Data saver drops the blur to a solid surface. It is
 * one island per screen, so it holds the one glow of the view only through the
 * panel material it shares with sheets; it adds none of its own.
 *
 * ONE COMPONENT, TWO SIZES, AND THE MORPH BETWEEN THEM. Rebuilt from the
 * founder's `dynamic-island.tsx`, whose point is the way the island changes shape
 * rather than swapping screens. The header (glyph, title, one line, a quiet
 * toggle) is always there. Open it and the island WIDENS and the body (steps,
 * progress, meta, one action) grows beneath it, both on a gentle spring, so the
 * same object has become a larger version of itself. That is framer-motion's job
 * and CSS cannot do it as well: the spring is interruptible (collapse it
 * mid-widen and it turns round from where it is), and `AnimatePresence` lets the
 * body finish closing before it leaves the page. The original gets the morph
 * from the `layout` prop, which lives in the `domMax` bundle; the platform loads
 * `domAnimation` only (MotionProvider), so the width is animated directly, in
 * pixels measured from the viewport. The size change is the one deliberate
 * layout animation here, because the size change IS the idea.
 * Controlled with `expanded` and `onExpandedChange`, or uncontrolled with
 * `defaultExpanded`. Quiet readers (system reduced motion, Calm, Off) get the
 * final size at once.
 *
 * ANNOUNCING. The title and line sit in a polite live region, so a change
 * ("Waiting for the bank" to "Confirmed") is read once, not on every render.
 * Step state is spoken through `stepStateLabels`, because a tick or a ring is
 * never the only signal (north star section 3).
 */

export type LiveStep = {
  id: string;
  label: string;
  state: "done" | "current" | "todo";
};

type StepsProps =
  | {
      steps: readonly LiveStep[];
      /** The spoken words for each step state. Required with `steps`. */
      stepStateLabels: { done: string; current: string; todo: string };
    }
  | { steps?: undefined; stepStateLabels?: undefined };

export type LiveIslandProps = StepsProps & {
  /** The region's accessible name, e.g. what kind of status this is. */
  label: string;
  title: string;
  /** One line under the title. */
  detail?: string;
  icon: UiIconName;
  tone?: IconPlateTone;
  /**
   * A real fraction from 0 to 1 and the bar's accessible name. Omit it when the
   * progress is not known: there is no indeterminate state.
   */
  progress?: { value: number; label: string };
  /** Anything the caller must render itself: a real clock, a `Money` figure. */
  meta?: ReactNode;
  /** The one action, e.g. cancel an upload. */
  action?: { label: string; onClick: () => void; tone?: "default" | "danger" };
  placement?: "top" | "bottom";
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** The toggle's accessible names. */
  expandLabel: string;
  collapseLabel: string;
  className?: string;
  "data-testid"?: string;
};

/** The viewport's width, or null before mount (the server has none). */
function useViewportWidth(): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setWidth(document.documentElement.clientWidth);
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return width;
}

export function LiveIsland(props: LiveIslandProps) {
  const {
    label,
    title,
    detail,
    icon,
    tone = "brand",
    progress,
    meta,
    action,
    placement = "top",
    expanded,
    defaultExpanded = false,
    onExpandedChange,
    expandLabel,
    collapseLabel,
    className,
  } = props;
  const bodyId = useId();
  const { quiet } = useMotionGate();
  const viewport = useViewportWidth();
  const [inner, setInner] = useState(defaultExpanded);
  const open = expanded ?? inner;
  const hasBody = Boolean(props.steps?.length || progress || meta || action);
  const pct = progress ? Math.round(Math.min(1, Math.max(0, progress.value)) * 100) : undefined;

  /* The two widths, in px, from the same formula the stylesheet uses for its
     first paint (`min(18rem or 26rem, viewport minus 2rem)`), so the spring and
     the CSS agree and nothing jumps when this takes over. */
  const widths = viewport ? { open: Math.min(416, viewport - 32), closed: Math.min(288, viewport - 32) } : null;
  const wide = hasBody && open;

  const toggle = () => {
    const next = !open;
    if (expanded === undefined) setInner(next);
    onExpandedChange?.(next);
  };

  return (
    <m.section
      aria-label={label}
      className={cn("nf-live", className)}
      data-placement={placement}
      data-open={wide || undefined}
      data-testid={props["data-testid"]}
      initial={false}
      animate={widths ? { width: wide ? widths.open : widths.closed } : undefined}
      transition={springFor(quiet, SPRING_GENTLE)}
    >
      <div className="nf-live__head">
        <IconPlate tone={tone} shape="round" size="md">
          <UiIcon name={icon} size={20} />
        </IconPlate>
        <div className="nf-live__text" role="status" aria-live="polite">
          <p className="nf-live__title">{title}</p>
          {detail ? <p className="nf-live__detail">{detail}</p> : null}
        </div>
        {hasBody ? (
          <button
            type="button"
            className="nf-live__toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? collapseLabel : expandLabel}
            onClick={toggle}
          >
            <UiIcon name="chevron-down" size={20} className="nf-live__chevron" />
          </button>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {hasBody && open ? (
          <m.div
            key="body"
            id={bodyId}
            className="nf-live__panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springFor(quiet, SPRING_GENTLE)}
          >
            <div className="nf-live__body">
              {pct !== undefined ? (
                <div
                  role="progressbar"
                  aria-label={progress?.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  className="nf-live__bar"
                >
                  <span className="nf-live__fill" style={{ ["--nf-live-p" as string]: String(pct / 100) }} />
                </div>
              ) : null}
              {props.steps?.length ? (
                <ol className="nf-live__steps">
                  {props.steps.map((step) => (
                    <li
                      key={step.id}
                      className="nf-live__step"
                      data-state={step.state}
                      aria-current={step.state === "current" ? "step" : undefined}
                    >
                      <span className="nf-live__mark" aria-hidden="true">
                        {step.state === "done" ? <UiIcon name="check" size={16} /> : null}
                      </span>
                      <span className="nf-live__step-label">{step.label}</span>
                      <span className="sr-only">{props.stepStateLabels[step.state]}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
              {meta ? <div className="nf-live__meta">{meta}</div> : null}
              {action ? (
                <Button
                  variant={action.tone === "danger" ? "danger" : "glass"}
                  size="sm"
                  full
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </m.section>
  );
}
