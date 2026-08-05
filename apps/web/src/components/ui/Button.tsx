"use client";

import Link from "next/link";
import { Children, forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { UiIcon, type UiIconSize, type UiIconName } from "@/design-system/icons/UiIcon";

/**
 * The button.
 *
 * Before this existed there were twelve separate button implementations across
 * the platform, carrying forty-five distinct override signatures over a hundred
 * and forty call sites, shipping seven different heights (32/36/40/41/44/46/48)
 * and seven different disabled opacities. Nothing downstream could be
 * consistent, because every button was negotiated locally.
 *
 * The split of responsibility: `.nf-*` CSS owns the *material* - the gradient,
 * the sheen, the glow, the theme behaviour. This component owns the *geometry,
 * state and motion* - height, radius, press feedback, loading, haptics and
 * accessibility. A call site chooses a variant and a size and nothing else.
 *
 * Height is deliberately not overridable. If a design needs a height that is
 * not sm/md/lg, the design is wrong or the scale needs a fourth rung added
 * here, once, for everyone.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dangerQuiet"
  | "glass";

/** 40 / 48 / 56px. No other button heights exist on the platform. */
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "nf-btn--primary",
  secondary: "nf-btn--glass",
  ghost: "nf-btn--ghost",
  danger: "nf-btn--danger",
  dangerQuiet: "nf-btn--danger-quiet",
  glass: "nf-btn--glass",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "nf-btn--sm",
  md: "nf-btn--md",
  lg: "nf-btn--lg",
};

/** Icon sizing tracks the button size so the glyph stays optically centred. */
/*
 * On the icon scale, not beside it.
 *
 * This was 15/17/19, which are three of the fifteen ad-hoc sizes the icon sweep
 * existed to remove. `UiIcon` snaps anything off-scale at render time, so those
 * numbers were already being drawn at 16/16/20; the literals only meant the
 * source disagreed with the pixels. Naming the real steps makes the two agree
 * and keeps the button's own comment honest.
 */
const ICON_SIZE: Record<ButtonSize, UiIconSize> = { sm: 16, md: 16, lg: 20 };

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fills its container. Pinned-footer CTAs are always full. */
  full?: boolean;
  /**
   * Shows a spinner in the leading slot and dims the label. The label stays put,
   * so the button never changes width mid-press.
   */
  loading?: boolean;
  leadingIcon?: UiIconName;
  trailingIcon?: UiIconName;
  /**
   * Square, glyph-only. Always pass `aria-label` alongside it - an icon-only
   * control with no label is invisible to a screen reader. That pairing is a
   * convention here rather than a type constraint; expressing it in the type
   * would need a discriminated union across both Button and ButtonLink.
   */
  iconOnly?: boolean;
  /**
   * Fires a short `navigator.vibrate` on press where the device supports it.
   * Defaults on for primary and danger, which are the consequential actions.
   * `navigator.vibrate` appeared zero times in this codebase before now.
   */
  haptic?: boolean;
  className?: string;
  children?: ReactNode;
};

function buttonClass({
  variant = "secondary",
  size = "md",
  full,
  iconOnly,
  className,
}: Pick<CommonProps, "variant" | "size" | "full" | "iconOnly" | "className">) {
  return [
    "nf-btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    full ? "nf-btn--full" : "",
    iconOnly ? "nf-btn--icon" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A press is worth about 8ms of vibration. Long enough to register as physical,
 * short enough that a user tapping quickly through a list does not feel it as
 * buzzing. Guarded because desktop Safari and iOS Safari do not implement it.
 */
function pulse(enabled: boolean) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(8);
  } catch {
    /* Vibration is a nicety. A device that refuses it changes nothing. */
  }
}

function Content({
  loading,
  leadingIcon,
  trailingIcon,
  size,
  children,
}: Pick<CommonProps, "loading" | "leadingIcon" | "trailingIcon" | "children"> & {
  size: ButtonSize;
}) {
  const icon = ICON_SIZE[size];
  /*
   * Children are rendered as separate flex siblings, not wrapped in one span.
   *
   * Wrapping them collapsed the button's `gap: 0.5rem` to nothing, because gap
   * only separates flex children and there was suddenly just one. Any call site
   * passing an icon element alongside its text - seven of them did - rendered
   * the glyph jammed against the first letter with no gap, and sitting on the
   * text baseline rather than optically centred, because inside the wrapper it
   * was inline content rather than a flex item.
   *
   * Only text is given the label class; element children keep their own layout.
   * The label class is what `[data-loading]` dims, and dimming an icon the
   * caller passed deliberately would be wrong.
   */
  const parts = Children.toArray(children);
  return (
    <>
      {loading ? (
        <span className="nf-spinner" aria-hidden="true" />
      ) : leadingIcon ? (
        <UiIcon name={leadingIcon} size={icon} />
      ) : null}
      {parts.map((part, i) =>
        typeof part === "string" || typeof part === "number" ? (
          <span key={i} className="nf-btn__label">
            {part}
          </span>
        ) : (
          part
        ),
      )}
      {trailingIcon && !loading ? <UiIcon name={trailingIcon} size={icon} /> : null}
    </>
  );
}

export type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export const Button = forwardRef(function Button(
  {
    variant = "secondary",
    size = "md",
    full,
    loading = false,
    leadingIcon,
    trailingIcon,
    iconOnly,
    haptic,
    className,
    children,
    disabled,
    onPointerDown,
    ...rest
  }: ButtonProps,
  ref: Ref<HTMLButtonElement>,
) {
  const wantsHaptic = haptic ?? (variant === "primary" || variant === "danger");
  return (
    /*
     * `rest` is spread FIRST so nothing a call site passes can clobber the
     * props computed below. The previous order happened to be safe - disabled
     * and onPointerDown are destructured out, and no call site passes an
     * explicit type={undefined} - but it depended on that staying true.
     */
    <button
      {...rest}
      ref={ref}
      type={rest.type ?? "button"}
      className={buttonClass({ variant, size, full, iconOnly, className })}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      onPointerDown={(event) => {
        if (!disabled && !loading) pulse(wantsHaptic);
        onPointerDown?.(event);
      }}
    >
      <Content
        loading={loading}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        size={size}
      >
        {children}
      </Content>
    </button>
  );
});

export type ButtonLinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children">;

/**
 * The same button as a navigation target. Separate from `Button` rather than a
 * polymorphic `as` prop, because the two have genuinely different prop sets and
 * a union of them types badly at every call site.
 */
export const ButtonLink = forwardRef(function ButtonLink(
  {
    variant = "secondary",
    size = "md",
    full,
    loading = false,
    leadingIcon,
    trailingIcon,
    iconOnly,
    haptic,
    className,
    children,
    onPointerDown,
    ...rest
  }: ButtonLinkProps,
  ref: Ref<HTMLAnchorElement>,
) {
  const wantsHaptic = haptic ?? (variant === "primary" || variant === "danger");
  return (
    <Link
      {...rest}
      ref={ref}
      className={buttonClass({ variant, size, full, iconOnly, className })}
      data-loading={loading || undefined}
      onPointerDown={(event) => {
        pulse(wantsHaptic);
        onPointerDown?.(event);
      }}
    >
      <Content
        loading={loading}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        size={size}
      >
        {children}
      </Content>
    </Link>
  );
});
