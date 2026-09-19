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

/**
 * FIVE VARIANTS FOR FIVE IMPLEMENTATIONS. There were six for five.
 *
 * `secondary` and `glass` both resolved to `.nf-btn--glass`: two public names
 * for one button, so a reader could not tell whether a call site had made a
 * choice or had guessed. `secondary` is the honest name for the quiet action
 * beside the primary one, and `glass` described the material rather than the
 * job, which is what the class name is for. Nothing on the platform passed
 * `variant="glass"`, so this removes a name rather than a button.
 */
/*
 * `glass` IS BACK, AND IT IS A DIFFERENT BUTTON FROM `secondary`.
 *
 * The note above records why the old alias went: two names for one class.
 * The renders draw a second quiet button that `secondary` does not: Explore
 * Stays beside Explore Properties, Contact Hotel beside View booking details,
 * Reset beside Apply. Same glass, but with the BRAND edge and a lit rim, so
 * it reads as part of the same lit object as the primary rather than as a
 * neutral plate next to it. Two workers reached for `variant="glass"` before
 * it existed, which is the clearest sign a vocabulary is missing a word.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "glass"
  | "ghost"
  | "danger"
  | "dangerQuiet";

/**
 * RETIRED BY THE SHAPE LAW, and kept only so nothing breaks on the night it
 * landed. A control that carries text is a rounded rectangle on
 * `--nf-radius-control`; there is no capsule variant of a control any more.
 * The founder's ruling supersedes the section 8 amendment this type was
 * written for, and `docs/DESIGN_DIRECTION.md` section 1 now states it.
 *
 * Nothing under `app/` or `components/` outside `app/(dev)/preview/g1/` passes
 * `shape="pill"`. When the `nf-btn--pill` rule goes from the stylesheets, and
 * `check-css-tokens.mjs` rule 10 is what will make it go, this type and the
 * prop go with it.
 *
 * @deprecated The shape law leaves one control shape. Do not pass "pill".
 */
export type ButtonShape = "control" | "pill";

/**
 * 44 / 48 / 56px, down from 44 / 56 / 64.
 *
 * The large button was a 64px slab at 17px type: the landing hero CTA measured
 * 64 by 350 at 390px, which is a banner. This is the iOS ladder, and 44 is
 * still the floor. The heights themselves live in `css/buttons.css`; this union
 * is the vocabulary. No other button heights exist on the platform.
 */
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "nf-btn--primary",
  secondary: "nf-btn--glass",
  glass: "nf-btn--glass-brand",
  ghost: "nf-btn--ghost",
  danger: "nf-btn--danger",
  dangerQuiet: "nf-btn--danger-quiet",
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "nf-btn--sm",
  md: "nf-btn--md",
  lg: "nf-btn--lg",
};

/** Icon sizing tracks the button size so the glyph stays optically centred. */
/*
 * 16 / 20 / 24, and it was 20 / 24 / 24.
 *
 * Two of the three were the same number, which is the fault the type scale had
 * before it was fixed: a caller choosing the medium button believed they were
 * choosing a smaller glyph and changed nothing. With the heights now stepping
 * 44 / 48 / 56 the glyphs step with them, one rung of the `UiIcon` grid each,
 * and all three are on it.
 */
const ICON_SIZE: Record<ButtonSize, UiIconSize> = { sm: 16, md: 20, lg: 24 };

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
   * The render's trailing arrow (Explore Properties, Learn more, Read more):
   * an `arrow-right` in the trailing slot that nudges on hover. Sugar over
   * `trailingIcon` so a caller cannot pick the wrong glyph for the job.
   */
  arrow?: boolean;
  /**
   * The soft bloom the renders' primaries carry at rest. Off by default,
   * because the base primary treats its bloom as a state and every caller
   * stands on that; a screen matching a render switches it on for the one
   * action the render lights.
   */
  glow?: boolean;
  shape?: ButtonShape;
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
  glow,
  shape = "control",
  className,
}: Pick<CommonProps, "variant" | "size" | "full" | "iconOnly" | "glow" | "shape" | "className">) {
  return [
    "nf-btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    full ? "nf-btn--full" : "",
    iconOnly ? "nf-btn--icon" : "",
    glow ? "nf-btn--lit" : "",
    shape === "pill" ? "nf-btn--pill" : "",
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
  arrow,
  size,
  children,
}: Pick<CommonProps, "loading" | "leadingIcon" | "trailingIcon" | "arrow" | "children"> & {
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
      {arrow && !trailingIcon && !loading ? (
        <span className="nf-btn__arrow" aria-hidden="true">
          <UiIcon name="arrow-right" size={icon} />
        </span>
      ) : null}
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
    arrow,
    glow,
    shape,
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
      className={buttonClass({ variant, size, full, iconOnly, glow, shape, className })}
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
        arrow={arrow}
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
    arrow,
    glow,
    shape,
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
      className={buttonClass({ variant, size, full, iconOnly, glow, shape, className })}
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
        arrow={arrow}
        size={size}
      >
        {children}
      </Content>
    </Link>
  );
});
