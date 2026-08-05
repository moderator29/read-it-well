"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The chip, and the rail it lives in.
 *
 * Chips were the most-copied control on the platform: 51 call sites, each
 * re-deciding four things that should never have been local decisions.
 *
 * What the audit found, and what this fixes:
 *
 * 1. TOUCH. A chip paints at ~36px because that is the right visual weight in a
 *    filter row - taller and the row stops reading as a row. But 47 of the 51
 *    usages were tappable at 36px, which is under the 44pt floor, and four of
 *    them had reached for `!py-1.5` to force the height back DOWN after someone
 *    tried to fix it by inflating the box. Inflating the box is the wrong fix.
 *    Interactive chips here keep their painted height and grow only their hit
 *    region, via a centred overlay that overflows the chip's own box.
 *
 * 2. SELECTION. Selected was a border glow. A glow is a hue shift on a hairline;
 *    at arm's length on a phone in daylight it is not a state change. Selection
 *    here is a real ring plus a fill tint, so it survives a bright screen and
 *    a colour-blind reader alike. It is also applied by the component rather
 *    than by `.nf-chip[aria-pressed="true"]`, because that selector matches only
 *    toggle chips - a `role="radio"` chip picked up no selected state at all.
 *
 * 3. THE ROW. Rows hard-clipped at the gutter, so the rail ended on a chip
 *    sliced down the middle with no indication that scrolling would reveal
 *    more. `ChipRow` bleeds into the gutter, snaps, hides its scrollbar and
 *    fades its trailing edge - the reference set's rail, in one place.
 *
 * 4. THE PHOTO. Reference 5's signature category chip carries a real photograph
 *    inside the pill, not a glyph. That detail existed nowhere on the platform.
 *    `thumbnail` is it.
 *
 * The `.nf-*` / component split is the same as `Button`: CSS owns the material
 * (the glass fill, the hairline, the hover), this file owns geometry, state,
 * semantics and the hit target.
 */

/**
 * `filter` toggles independently (aria-pressed). `choice` is one of a set and
 * belongs inside a `ChipRow radiogroup` (role=radio). `link` navigates. `static`
 * is not interactive at all - an attribute or a read-only tag - and is the only
 * behaviour that does NOT get the 44px target, because there is nothing to hit.
 */
export type ChipBehaviour = "filter" | "choice" | "link" | "static";

/** 36px display-only / 44px interactive. No other chip heights exist. */
export type ChipSize = "sm" | "md";

type ChipCommonProps = {
  selected?: boolean;
  size?: ChipSize;
  icon?: UiIconName;
  /** A tabular trailing count. Proportional digits visibly jitter as counts change. */
  count?: number;
  /**
   * A photograph rendered INSIDE the pill, circular, at the leading edge.
   * Decorative by definition: the chip's label already names the thing, so a
   * second announcement of it would be noise to a screen reader.
   */
  thumbnail?: string;
  onSelectedChange?(next: boolean): void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
};

/*
 * `href` is expressed in the type rather than left optional, because a chip with
 * behaviour="link" and no destination is a chip that silently does nothing - the
 * failure is invisible in review and obvious to a user.
 */
export type ChipProps =
  | (ChipCommonProps & { behaviour?: "filter" | "choice" | "static"; href?: never })
  | (ChipCommonProps & { behaviour: "link"; href: string });

/** Painted height. The hit target is decided separately, below. */
const HEIGHT: Record<ChipSize, string> = { sm: "h-9", md: "h-11" };
const ICON_PX: Record<ChipSize, number> = { sm: 14, md: 15 };
const THUMB_PX: Record<ChipSize, number> = { sm: 22, md: 26 };

/**
 * Selected, as a ring and a fill rather than a glow.
 *
 * Written inline rather than as a class because the tint needs `color-mix` off
 * the brand token and this primitive may not add rules to globals.css. Inline
 * also means it beats the layered `.nf-chip` hover and pressed rules without a
 * specificity fight, which is what kept the old selected state from surviving
 * a hover.
 */
const SELECTED_STYLE: CSSProperties = {
  background: "color-mix(in oklab, var(--nf-brand-primary) 20%, transparent)",
  borderColor: "transparent",
  color: "var(--nf-content-primary)",
  boxShadow:
    "0 0 0 2px var(--nf-brand-primary), inset 0 0 0 1px color-mix(in oklab, var(--nf-brand-primary) 45%, transparent)",
};

function ChipInner({
  size,
  icon,
  count,
  thumbnail,
  selected,
  children,
}: Pick<ChipCommonProps, "icon" | "count" | "thumbnail" | "selected" | "children"> & {
  size: ChipSize;
}) {
  return (
    <>
      {thumbnail ? (
        <Image
          src={thumbnail}
          alt=""
          width={THUMB_PX[size] * 2}
          height={THUMB_PX[size] * 2}
          className="shrink-0 rounded-full object-cover"
          style={{ width: THUMB_PX[size], height: THUMB_PX[size] }}
        />
      ) : icon ? (
        <UiIcon name={icon} size={ICON_PX[size]} filled={selected} />
      ) : null}
      <span className="whitespace-nowrap">{children}</span>
      {typeof count === "number" ? (
        <span className="nf-numeric text-[0.8em] opacity-70">{count}</span>
      ) : null}
    </>
  );
}

/**
 * The 44pt guarantee.
 *
 * An absolutely positioned child that overflows its parent still delivers its
 * pointer events to that parent, so the chip becomes tappable across the whole
 * overlay while painting at its own height. Growing `min-height` instead would
 * push every rail on the platform 8px taller and re-break the rhythm the four
 * `!py-1.5` hacks were fighting to restore.
 *
 * `aria-hidden` because it is a hit area, not content, and it must never be
 * announced or reachable.
 */
function TouchTarget() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-auto absolute inset-x-0 top-1/2 h-full min-h-11 -translate-y-1/2"
    />
  );
}

export function Chip(props: ChipProps) {
  const {
    selected = false,
    behaviour = "filter",
    size = "md",
    icon,
    count,
    thumbnail,
    onSelectedChange,
    disabled,
    className,
    children,
  } = props;

  const classes = [
    "nf-chip relative select-none",
    HEIGHT[size],
    // A photo needs the leading padding pulled in or the pill reads as a chip
    // with a gap in front of it rather than a chip containing a photo.
    thumbnail ? "gap-2 pl-1 pr-3.5" : "px-3.5",
    disabled ? "pointer-events-none opacity-45" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = selected ? SELECTED_STYLE : undefined;
  const inner = (
    <ChipInner size={size} icon={icon} count={count} thumbnail={thumbnail} selected={selected}>
      {children}
    </ChipInner>
  );

  if (props.behaviour === "link") {
    return (
      <Link
        href={props.href}
        className={classes}
        style={style}
        /*
         * A selected link chip is describing where the user already is. That is
         * `aria-current`, not `aria-pressed`: nothing was toggled.
         */
        aria-current={selected ? "page" : undefined}
      >
        {inner}
        <TouchTarget />
      </Link>
    );
  }

  if (behaviour === "static") {
    // No role, no tabindex, no hit area. A decorative tag that answers a click
    // with nothing is worse than one that never invited the click.
    return (
      <span className={classes} style={style}>
        {inner}
      </span>
    );
  }

  const choice = behaviour === "choice";
  return (
    <button
      type="button"
      className={classes}
      style={style}
      disabled={disabled}
      role={choice ? "radio" : undefined}
      aria-checked={choice ? selected : undefined}
      aria-pressed={choice ? undefined : selected}
      /*
       * Roving tabindex: a radio group is one stop in the tab order and the
       * arrow keys move within it (handled by `ChipRow radiogroup`). A filter
       * chip is an independent control and keeps its own stop.
       */
      tabIndex={choice ? (selected ? 0 : -1) : undefined}
      onClick={() => onSelectedChange?.(choice ? true : !selected)}
    >
      {inner}
      <TouchTarget />
    </button>
  );
}

/**
 * The trailing fade.
 *
 * `mask-image` on a gradient is read as ALPHA, so only the stop's opacity
 * matters and its hue is irrelevant. A `--nf-*` token is used rather than the
 * conventional `black` so this file contains no colour literal at all - the
 * brand palette is frozen, and a stencil is not a place to start an exception.
 * Both content tokens are fully opaque in either theme, which is the only
 * property the mask actually consumes.
 */
const EDGE_FADE =
  "linear-gradient(to right, var(--nf-content-primary) 0, var(--nf-content-primary) calc(100% - 2.5rem), transparent 100%)";

/** The screen gutter. Bleeding by exactly this puts the rail edge-to-edge. */
const GUTTER = "1.25rem";

export function ChipRow({
  children,
  /** `x proximity`, not `mandatory`: a rail should be nudgeable, not magnetic. */
  snap = true,
  /** The right-edge mask, so the next chip fades instead of being sliced. */
  fadeEdges = true,
  /** Negative gutter margin, so the rail runs to the screen edge. */
  bleed = true,
  /**
   * Makes the row a real radio group for `behaviour="choice"` chips: one tab
   * stop, arrow keys to move, selection following focus. Radio children with no
   * group around them are invalid ARIA and unreachable by keyboard.
   */
  radiogroup = false,
  /** Accessible name for the group. Required whenever `radiogroup` is set. */
  label,
  className,
}: {
  children: ReactNode;
  snap?: boolean;
  fadeEdges?: boolean;
  bleed?: boolean;
  radiogroup?: boolean;
  label?: string;
  className?: string;
}) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!radiogroup) return;
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])'),
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.findIndex((el) => el === document.activeElement);
    const next = items[(Math.max(0, current) + delta + items.length) % items.length]!;
    next.focus();
    /*
     * Selection follows focus, which is what the radio pattern specifies and
     * what makes an arrow-key sweep through filters actually filter. `focus()`
     * scrolls the chip into view on its own, so the rail tracks the keyboard.
     */
    next.click();
  };

  return (
    <div
      role={radiogroup ? "radiogroup" : undefined}
      aria-label={label}
      onKeyDown={onKeyDown}
      /*
       * `.nf-scroll-x` supplies the material: overflow, hidden scrollbars in
       * both engines (a `::-webkit-scrollbar` rule cannot be written inline),
       * and snap alignment on the children.
       */
      className={["nf-scroll-x flex items-center gap-2", bleed ? "px-5" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{
        scrollSnapType: snap ? "x proximity" : "none",
        // Snap stops land at the gutter, not under it, so a snapped chip is
        // never half-hidden behind the screen edge.
        scrollPaddingInline: bleed ? GUTTER : undefined,
        // Without this, flicking the rail past its end scrolls the page behind
        // it - and on iOS triggers the back-swipe.
        overscrollBehaviorX: "contain",
        marginInline: bleed ? `calc(${GUTTER} * -1)` : undefined,
        ...(fadeEdges ? { maskImage: EDGE_FADE, WebkitMaskImage: EDGE_FADE } : null),
      }}
    >
      {children}
    </div>
  );
}
