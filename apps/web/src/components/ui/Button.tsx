"use client";

import Link from "next/link";
import { Children, forwardRef, useEffect, useRef, useState } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { joinTextParts } from "./button-label";
import { UiIcon, type UiIconSize, type UiIconName } from "@/design-system/icons/UiIcon";
import { feedback } from "@/lib/ui/feedback";

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
 * neutral plate next to it. Two screens reached for `variant="glass"` before
 * it existed, which is the clearest sign a vocabulary is missing a word.
 */
/*
 * FOUR LEVELS, ONE PER JOB (the clean unified sweep, 29 September 2026;
 * `docs/design/CLEAN_UNIFIED_DIRECTION.md` section 3):
 *
 *   primary    ONE per view. A solid brand pill on paper; the lit bar with
 *              its glow at night (the glow budget's one button).
 *   secondary  a white pill on a soft shadow in light, a raised night
 *              surface at night (section 17: every text button is a pill).
 *   quiet      no fill, brand ink ("See all 8", "Manage", row actions).
 *   icon       a 44px square on a hairline (prev and next, row tools);
 *              pass `aria-label`. `round` makes it the 44px white circle the
 *              header's back, search, bell and more take (section 17).
 *
 * `ghost` is the old name of `quiet` and renders it. `glass` renders the
 * secondary: the brand-edged glass secondary was a second glowing button
 * beside the primary, which the glow budget ends. `danger` and
 * `dangerQuiet` stay for the destructive pair.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "quiet"
  | "icon"
  | "glass"
  | "ghost"
  | "danger"
  | "dangerQuiet";

/**
 * EVERY TEXT BUTTON IS A RECTANGLE WITH SOFT CORNERS (the founder's ruling of
 * 30 September 2026, over the pills of references 44, 45 and 55;
 * CLEAN_UNIFIED_DIRECTION.md sections 17 and 19). The shape lives in
 * `buttons.css` on `--nf-act-radius-sm/-md/-lg` (10 / 12 / 14px, one per
 * size), and icon buttons are circles, so `shape="pill"` is a no-op that
 * nothing needs to pass. The history below is kept as the record.
 *
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
  quiet: "nf-btn--quiet",
  icon: "nf-btn--surface nf-btn--icon",
  glass: "nf-btn--glass",
  ghost: "nf-btn--quiet",
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
   * The button is waiting on an answer. The leading slot draws a ring ONCE and
   * holds it still, and a 2px line along the bottom edge sweeps across once and
   * holds full width; nothing spins or loops, however long the wait, because
   * a spinner says "working" whether or not anything is (the platform bans
   * them). The label stays put, so the button never changes width mid-press,
   * and `aria-busy` says the state to a screen reader. A caller that wants the
   * wait to be a deliberate moment passes `morph` (below).
   */
  loading?: boolean;
  /**
   * The job just finished: the leading slot shows a check that pops in
   * (details.css), for the moment a save or a send lands. The caller holds it
   * for a beat (`useDoneFlash`) and lets it go; the label stays, so the
   * button never changes width. A small win gets this, never a modal.
   */
  done?: boolean;
  /**
   * THE ACTION MORPH (Session 3; north star motion 7, reference 7061). Opt
   * in, and `loading` and `done` change meaning: loading closes the button to
   * a circle and draws an arc ONCE, which then holds still however long the
   * wait (never a spinner); done closes the ring, draws a tick and gives the
   * payoff pop; letting go of both settles it back to the rectangle. The box
   * never changes size (buttons.css, "THE ACTION MORPH").
   *
   * The pop is reserved for confirm, verify, unlock, release and earn
   * (MOTION_SYSTEM.md principle 5), so pass `morph` on the one action a
   * screen exists for when it is one of those, and pass `done` only when the
   * server has said so. Text buttons only; ignored on `variant="icon"`.
   */
  morph?: boolean;
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
   * With `variant="icon"` only: the 44px circle of the header's back,
   * search, bell and more (section 17, extending Q1).
   */
  round?: boolean;
  /**
   * Fires the `select` kind of `lib/ui/feedback.ts` on press: a light impact
   * in the native shell, a short pulse on Android web, nothing on iOS web.
   *
   * OFF BY DEFAULT since V-30. It used to buzz every primary and danger press,
   * before anybody knew whether the action was accepted, identically for
   * "pressed" and "paid", and never on an iPhone. The outcome is now felt
   * where it is known: `ResultSheet` fires success, warning or error when it
   * opens. Pass `haptic` only for a press that is itself the choice (a
   * toggle-like control), never for a submit.
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
  round,
  morph,
  className,
}: Pick<CommonProps, "variant" | "size" | "full" | "iconOnly" | "glow" | "shape" | "round" | "morph" | "className">) {
  /* The icon button is always the 44px rung, whatever size was asked. */
  const sized = variant === "icon" ? "sm" : size;
  return [
    "nf-btn",
    VARIANT_CLASS[variant],
    SIZE_CLASS[sized],
    variant === "icon" && round ? "nf-btn--round" : "",
    full ? "nf-btn--full" : "",
    iconOnly ? "nf-btn--icon" : "",
    glow ? "nf-btn--lit" : "",
    shape === "pill" ? "nf-btn--pill" : "",
    morph ? "nf-btn--morph" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * A press, felt as `select` through the one feedback grammar (V-30). The
 * grammar owns the channel: native haptics in the shell, a pattern on Android
 * web, silence on iOS web. `feedback` never throws.
 */
function pulse(enabled: boolean) {
  if (!enabled) return;
  /* STORE-04 and V-30: inside the app the native haptic engine takes the tap
     (iOS has no `navigator.vibrate`); `feedback` chooses the channel. */
  feedback("select");
}

function DoneCheck({ size }: { size: number }) {
  return (
    <span className="nf-btn__done" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** How long the morph takes to settle back to the rectangle (`base`). */
export const MORPH_SETTLE_MS = 240;

export type MorphState = "loading" | "done" | "settle" | undefined;

/**
 * The morph's state from the caller's two booleans, with the one thing the
 * booleans cannot say: that the button WAS a circle a moment ago and is on
 * its way back. `settle` is held for `MORPH_SETTLE_MS` after loading or done
 * is let go, so the rectangle reopens on a curve instead of snapping.
 */
export function useMorphState(enabled: boolean, loading: boolean, done: boolean): MorphState {
  const target: MorphState = !enabled ? undefined : done ? "done" : loading ? "loading" : undefined;
  const [settling, setSettling] = useState(false);
  const was = useRef<MorphState>(target);
  useEffect(() => {
    const previous = was.current;
    was.current = target;
    if (target !== undefined || previous === undefined || previous === "settle") return;
    setSettling(true);
    const timer = window.setTimeout(() => setSettling(false), MORPH_SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [target]);
  if (target !== undefined) return target;
  return settling ? "settle" : undefined;
}

/** The ring and the tick the morph draws in the circle. Decorative. */
function MorphMark() {
  return (
    <span className="nf-btn__morph" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <circle className="nf-btn__arc" cx="12" cy="12" r="10" pathLength={1} />
        <path className="nf-btn__tick" d="M7.5 12.5l3 3 6-6.5" pathLength={1} />
      </svg>
    </span>
  );
}

function Content({
  loading,
  done,
  leadingIcon,
  trailingIcon,
  arrow,
  size,
  morph,
  children,
}: Pick<CommonProps, "loading" | "done" | "leadingIcon" | "trailingIcon" | "arrow" | "children"> & {
  size: ButtonSize;
  morph?: boolean;
}) {
  if (morph) {
    /* The face keeps the button's ordinary content and fades as the shape
       closes; the leading slot never shows the spinner or the check, because
       the circle carries both. */
    return (
      <>
        <span className="nf-btn__face">
          <Content leadingIcon={leadingIcon} trailingIcon={trailingIcon} arrow={arrow} size={size}>
            {children}
          </Content>
        </span>
        <MorphMark />
      </>
    );
  }
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
  /* Neighbouring text is one label (button-label.ts): `Take down ({n})` as
     three flex items printed "Take down ( 1 )". */
  const parts = joinTextParts(Children.toArray(children));
  return (
    <>
      {loading ? (
        /* The morph's own ring, small, in the leading slot: drawn once to
           three quarters and held (buttons.css, "loading, bounded"). */
        <span className="nf-btn__ring" aria-hidden="true">
          <svg viewBox="0 0 24 24" width={icon} height={icon}>
            <circle className="nf-btn__arc" cx="12" cy="12" r="10" pathLength={1} />
          </svg>
        </span>
      ) : done ? (
        <DoneCheck size={icon} />
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
    done,
    leadingIcon,
    trailingIcon,
    arrow,
    glow,
    shape,
    round,
    iconOnly,
    haptic,
    morph: morphProp,
    className,
    children,
    disabled,
    onPointerDown,
    ...rest
  }: ButtonProps,
  ref: Ref<HTMLButtonElement>,
) {
  const wantsHaptic = haptic === true;
  const morph = morphProp === true && variant !== "icon" && !iconOnly;
  const morphState = useMorphState(morph, loading, done === true);
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
      className={buttonClass({ variant, size, full, iconOnly, glow, shape, round, morph, className })}
      /* A morphing button that is done is still inert until it settles: a
         second tap on a tick would submit twice. */
      disabled={disabled || loading || (morph && morphState === "done")}
      data-loading={loading || undefined}
      data-morph={morphState}
      /* The caller's own busy state survives: `rest` is spread first, so
         writing only `loading` here erased an `aria-busy` the caller passed
         for work of its own (audit A7: "This was not me" and the feed's
         "Load more" went silent to a screen reader while pending). */
      aria-busy={loading || rest["aria-busy"] || undefined}
      onPointerDown={(event) => {
        if (!disabled && !loading) pulse(wantsHaptic);
        onPointerDown?.(event);
      }}
    >
      <Content
        loading={loading}
        done={done}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        arrow={arrow}
        size={variant === "icon" ? "md" : size}
        morph={morph}
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
    done,
    leadingIcon,
    trailingIcon,
    arrow,
    glow,
    shape,
    round,
    iconOnly,
    haptic,
    /* A link navigates; it has nothing to wait for, so it never morphs. */
    morph: _morph,
    className,
    children,
    onPointerDown,
    ...rest
  }: ButtonLinkProps,
  ref: Ref<HTMLAnchorElement>,
) {
  const wantsHaptic = haptic === true;
  return (
    <Link
      {...rest}
      ref={ref}
      className={buttonClass({ variant, size, full, iconOnly, glow, shape, round, className })}
      data-loading={loading || undefined}
      onPointerDown={(event) => {
        pulse(wantsHaptic);
        onPointerDown?.(event);
      }}
    >
      <Content
        loading={loading}
        done={done}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        arrow={arrow}
        size={variant === "icon" ? "md" : size}
      >
        {children}
      </Content>
    </Link>
  );
});
