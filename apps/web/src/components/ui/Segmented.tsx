"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The segmented control.
 *
 * There were five separate implementations on the platform and none of them did
 * what the reference set does. Three hard-swapped the active state with no
 * transition at all; two slid a 2px underline. Not one had the thing the
 * references actually show: a floating capsule with its own shadow that TRAVELS
 * between segments, so the eye follows the selection instead of losing it.
 *
 * The capsule is a single absolutely-positioned element measured against the
 * real segment boxes, which is what makes it work with labels of different
 * lengths and in four locales where the same word can be three times longer.
 * A ResizeObserver keeps it correct through font loading, orientation changes
 * and container resizes rather than measuring once and drifting.
 */

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: UiIconName;
  /** Rendered as a tabular trailing count, the way the reference filter rows do. */
  count?: number;
};

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  /**
   * `tabs` gives a tablist with roving tabindex and arrow-key movement, for
   * switching between views of the same screen. `radio` gives a radiogroup, for
   * choosing a value inside a form. They are genuinely different to a screen
   * reader and the wrong one is worse than none.
   */
  semantics = "tabs",
  size = "md",
  full,
  label,
  itemIdPrefix,
  panelIdPrefix,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange(next: T): void;
  semantics?: "tabs" | "radio";
  size?: "sm" | "md";
  full?: boolean;
  /** Accessible name for the group. Required: an unlabelled group is a puzzle. */
  label: string;
  /**
   * Wires the tab/panel relationship. When both are given, each tab gets
   * `${itemIdPrefix}-${value}` and points `aria-controls` at
   * `${panelIdPrefix}-${value}`, so a panel can name itself with
   * aria-labelledby. Without these the control is still a valid tablist, it
   * just has no panel association - which is correct for a filter row.
   */
  itemIdPrefix?: string;
  panelIdPrefix?: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [capsule, setCapsule] = useState<{ x: number; w: number } | null>(null);

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const measure = useCallback(() => {
    const track = trackRef.current;
    const item = itemRefs.current[index];
    if (!track || !item) return;
    setCapsule({ x: item.offsetLeft, w: item.offsetWidth });
  }, [index]);

  // Layout effect so the capsule is already in place on first paint rather
  // than visibly jumping into position after mount.
  useLayoutEffect(measure, [measure, options.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    for (const el of itemRefs.current) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  /* Fonts change label widths after first paint; remeasure when they land. */
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts?.ready) return;
    let live = true;
    void fonts.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
    };
  }, [measure]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (semantics !== "tabs") return;
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next]!.value);
    itemRefs.current[next]?.focus();
  };

  const pad = size === "sm" ? "p-[3px]" : "p-1";
  const seg =
    size === "sm"
      ? "h-9 px-3 text-[0.8125rem]"
      : "h-11 px-4 text-[0.875rem]";

  return (
    <div
      ref={trackRef}
      role={semantics === "tabs" ? "tablist" : "radiogroup"}
      aria-label={label}
      onKeyDown={onKeyDown}
      className={[
        "nf-segmented relative inline-flex items-center",
        pad,
        full ? "flex w-full" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/*
        The travelling capsule. aria-hidden because it carries no meaning of its
        own: the selection is already stated by aria-selected / aria-checked.
      */}
      {capsule ? (
        <span
          aria-hidden="true"
          className="nf-segmented__capsule"
          style={{ transform: `translateX(${capsule.x}px)`, width: `${capsule.w}px` }}
        />
      ) : null}

      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            role={semantics === "tabs" ? "tab" : "radio"}
            id={itemIdPrefix ? `${itemIdPrefix}-${o.value}` : undefined}
            aria-controls={panelIdPrefix ? `${panelIdPrefix}-${o.value}` : undefined}
            aria-selected={semantics === "tabs" ? selected : undefined}
            aria-checked={semantics === "radio" ? selected : undefined}
            tabIndex={semantics === "tabs" ? (selected ? 0 : -1) : 0}
            onClick={() => onChange(o.value)}
            className={[
              "nf-segmented__item relative z-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--nf-radius-pill)] font-semibold transition-colors",
              seg,
              full ? "flex-1" : "",
              selected
                ? "text-[var(--nf-content-primary)]"
                : "text-[var(--nf-content-muted)] hover:text-[var(--nf-content-secondary)]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {o.icon ? <UiIcon name={o.icon} size={15} filled={selected} /> : null}
            <span className="whitespace-nowrap">{o.label}</span>
            {typeof o.count === "number" ? (
              <span className="nf-numeric text-[0.75em] opacity-70">{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
