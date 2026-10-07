"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";
import type { AnimationPlaybackControls } from "framer-motion";
import "@/app/css/ported.css";
import { useMotionGate } from "@/components/motion/useMotionGate";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { cn } from "@/lib/cn";
import { reportClientError } from "@/lib/observability/client";
import { feedback } from "@/lib/ui/feedback";
import { SPRING_SETTLE, SPRING_SNAP, clamp, springFor, useDrive } from "./ported-motion";

/**
 * DRAG TO CONFIRM: THE CEREMONY FOR ACTIONS THAT CANNOT BE TAKEN BACK.
 *
 * Rebuilt from the founder's source (docs/design/component-library-source/
 * drag-to-confirm.tsx), whose note on it was "lovely clean and more perfect",
 * and ported to Vallo: tokens only, `UiIcon`, no lime, no invented copy, radius
 * 14. Its twelve-point list is in docs/design/COMPONENT_LIBRARY.md section 2.
 *
 * WHEN TO USE IT, AND WHEN NOT TO. A slide is a deliberate piece of friction, so
 * it is spent only where the action is genuinely irreversible: releasing a
 * protected payment, confirming a payout, deleting an account, an admin ruling
 * on a dispute. Never a form submit, navigation, saving a draft or
 * anything a tap should do. A product that makes people slide for everything has
 * made a toll booth of itself.
 *
 * THE FOUR RULES THE PORT KEEPS, because each one is the reason the control
 * exists:
 *
 *   1. MONEY NEVER AUTO-RESETS. `money` marks an action that moves money. When
 *      it is set, `autoResetDelay` is a type error and is ignored at runtime
 *      too, so a confirmed transfer can never quietly return to looking
 *      unconfirmed. (The founder's original reset after confirming; that is
 *      wrong for a payment.)
 *   2. THE CONFIRMED STATE PERSISTS. Once `onConfirm` has resolved the control
 *      stays confirmed, locked at the end of the track with a tick, until the
 *      owner unmounts it or (a non-money action only) the reset delay fires.
 *   3. THE KEYBOARD PATH IS A BUTTON, AND FOR MONEY IT TAKES TWO PRESSES. The
 *      handle is a real, focusable `<button>`. Enter, Space and a screen
 *      reader's activate arrive as a click with `detail === 0`. For a
 *      non-money action that confirms. For `money` it only ARMS the control:
 *      the handle steps forward, the track and the live region say
 *      `armedLabel` ("Press again to confirm"), and a second, separate
 *      activation confirms. Holding Enter does not count (its repeats are
 *      refused), and arming lapses after `ARM_MS`, on blur, on Escape or on a
 *      pointer. A pointer user has to cover 90 percent of the track, so one
 *      keystroke must not be easier than that (D49.2).
 *
 *      WHY A SECOND PRESS AND NOT `role="slider"`. A slider advanced by Arrow
 *      keys would match the pointer gesture more literally, but an ARIA slider
 *      on a `div` or `button` cannot be adjusted by VoiceOver on iOS, which
 *      only adjusts a native range input, and this product ships as an iOS
 *      app. A second activation works the same way for a keyboard, a switch
 *      device and every screen reader, and it says what it wants in words.
 *
 *      A pointer click does not confirm; it nudges the handle along its
 *      track, which teaches the gesture instead of punishing a tap. The
 *      founder's original put the fallback in a hidden second button; one real
 *      control with one name is cleaner for everybody.
 *   4. THE CONFIRMED STATE IS ONLY EVER TRUE. The handle slides under the
 *      person's own finger, but the track does not claim "confirmed" until
 *      `onConfirm` has resolved. Resolve `false`, or throw, and the control
 *      cuts back to rest (no spring: bad news is immediate) with the error haptic. The two are told apart: `false` is
 *      a DECLINE (the caller decided, nothing to report, `data-failed=
 *      "declined"`); a throw is a CRASH, reported through
 *      `reportClientError`, which ends at `reportError` on the server
 *      (`lib/observability/report.ts`), and marked `data-failed="crashed"`.
 *      For money, resolve only after the server has confirmed (MOTION_SYSTEM,
 *      "Money, where motion must never mislead").
 *
 * MOTION, AND WHY IT IS framer-motion HERE. The handle follows the finger through
 * a `useMotionValue`; the fill and the label read it through `useTransform`, so
 * all three move as one piece with no React render per frame. On release the
 * handle settles on a spring (`animate`), which is interruptible: put a finger
 * back on it while it is returning and the drag picks up from where it
 * currently is, with no jump. A CSS transition cannot do that. Drag itself is
 * written with pointer events rather than framer's `drag` prop, because `drag`
 * lives in a feature bundle and the platform loads none (D49.1). Nothing here
 * is an `m` element, which needs a feature bundle too, so `useDrive`
 * (ported-motion.ts) writes the values into the elements itself and the
 * control is fully usable
 * from its first frame. Reduced motion turns every settle into an instant jump
 * (`springFor`); the drag still tracks the finger, because that is direct
 * manipulation and not decoration.
 *
 * HAPTICS (CRAFT_DOCTRINE section 6, one grammar through `feedback()`): one
 * "confirm" when the person lets go past the threshold, one "success" when the
 * action is actually accepted, one "error" if it was not. Nothing while
 * dragging, and nothing for a slide let go of short.
 *
 * NO SPINNER. While `onConfirm` is pending the handle rests at the end, the
 * label changes to `confirmingLabel`, and the region is `aria-busy`.
 *
 * COPY. Every string is a prop and none has a default (four locales, and a
 * component must not carry a money sentence of its own; those come from
 * `lib/money/copy.ts`). SHAPE: the track is a control, radius 14; the handle is
 * the inner 10.
 */

type MoneyOrNot =
  | {
      /** This action moves money. Auto-reset is then impossible. */
      money: true;
      autoResetDelay?: never;
      /**
       * Said on the track and in the live region after the first keyboard or
       * screen-reader activation, which only arms a money action (rule 3).
       */
      armedLabel: string;
    }
  | {
      money?: false;
      armedLabel?: never;
      /**
       * Milliseconds after confirming before the control returns to rest. Only
       * for a non-money action that is genuinely repeatable; omit it and the
       * confirmed state stays.
       */
      autoResetDelay?: number;
    };

export type DragToConfirmProps = MoneyOrNot & {
  /** The resting prompt on the track, e.g. "Slide to confirm". */
  label: string;
  /** The track while `onConfirm` is pending. */
  confirmingLabel: string;
  /** The track once `onConfirm` has resolved. Persists. */
  confirmedLabel: string;
  /**
   * The handle's accessible name, which is what a keyboard or screen reader
   * activates. Defaults to `label`; pass a verb phrase when "Slide to" would be
   * wrong for the way the person is operating it.
   */
  keyboardLabel?: string;
  /** Said once, politely, if `onConfirm` did not succeed. Shown on the track too. */
  errorLabel?: string;
  /**
   * Runs once, when the slide completes or the keyboard path is used. Resolve
   * `false` or throw to say it did NOT happen; anything else says it did.
   */
  onConfirm: () => void | boolean | Promise<void | boolean>;
  /** Controlled override: render confirmed regardless of the internal state. */
  confirmed?: boolean;
  disabled?: boolean;
  /** `danger` for an account deletion; `brand` (default) for everything else. */
  tone?: "brand" | "danger";
  className?: string;
  "data-testid"?: string;
};

/** The handle's edge and the gap round it, in px. Mirrored in ported.css. */
const HANDLE = 48;
const PAD = 4;
/** How much of the track must be covered at release for the slide to count. */
const THRESHOLD = 0.9;
/** How far a plain tap nudges the handle to show which way it goes. */
const NUDGE = 14;
/** How long a money action stays armed after its first keyboard activation. */
export const ARM_MS = 6000;

type View = "idle" | "dragging" | "confirming" | "confirmed";
type Failure = "declined" | "crashed";

type FillDrive = { x: number; opacity: number };
/* Module level and stable, as `useDrive` requires. */
const writeHandle = (el: HTMLElement, v: number) => {
  el.style.transform = `translate3d(${v}px, 0, 0)`;
};
const writeFill = (el: HTMLElement, v: FillDrive) => {
  el.style.transform = `translate3d(${v.x}px, 0, 0)`;
  el.style.opacity = String(v.opacity);
};
const writeOpacity = (el: HTMLElement, v: number) => {
  el.style.opacity = String(v);
};

export function DragToConfirm(props: DragToConfirmProps) {
  const {
    label,
    confirmingLabel,
    confirmedLabel,
    keyboardLabel,
    errorLabel,
    onConfirm,
    confirmed: confirmedProp,
    disabled = false,
    tone = "brand",
    className,
  } = props;
  const isMoney = props.money === true;
  const armedLabel = props.money === true ? props.armedLabel : undefined;
  /* A money action never resets, whatever a loosely typed caller passed. */
  const autoResetDelay = isMoney ? undefined : props.autoResetDelay;

  const { quiet } = useMotionGate();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<View>("idle");
  const [failure, setFailure] = useState<Failure | null>(null);
  const failed = failure !== null;
  const [armed, setArmed] = useState(false);
  const armedRef = useRef(false);
  const view: View = confirmedProp ? "confirmed" : state;

  const x = useMotionValue(0);
  const maxRef = useRef(0);
  const widthRef = useRef(0);
  const flight = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ startX: number; from: number } | null>(null);
  const moved = useRef(false);
  const live = useRef(true);
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  /* Progress, 0 to 1. Everything visual reads this one value. */
  const progress = useTransform(x, (v) => (maxRef.current > 0 ? clamp(v / maxRef.current, 0, 1) : 0));
  /* The fill's leading edge rides under the handle's centre (4px gap plus half
     the 48px handle), and widens by the last 24px so that at the end it covers
     the whole track. The track's overflow clip rounds the far corners. Opaque
     as soon as a finger has moved, invisible at rest. */
  const fill = useTransform(x, (v): FillDrive => {
    const p = maxRef.current > 0 ? clamp(v / maxRef.current, 0, 1) : 0;
    return { x: v + PAD + HANDLE / 2 - widthRef.current + (HANDLE / 2) * p, opacity: Math.min(1, p * 12) };
  });
  /* The words are gone before the fill reaches them. */
  const labelOpacity = useTransform(progress, (p) => 1 - Math.min(1, p * 1.6));
  const handleRef = useDrive<HTMLButtonElement, number>(x, writeHandle);
  const fillRef = useDrive<HTMLSpanElement, FillDrive>(fill, writeFill);
  const labelRef = useDrive<HTMLSpanElement, number>(labelOpacity, writeOpacity);

  const fly = useCallback(
    (to: number, spring = SPRING_SETTLE) => {
      flight.current?.stop();
      flight.current = animate(x, to, springFor(quiet, spring));
      return flight.current;
    },
    [x, quiet],
  );

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return 0;
    widthRef.current = root.clientWidth;
    maxRef.current = Math.max(0, root.clientWidth - 2 * PAD - HANDLE);
    return maxRef.current;
  }, []);

  /* A confirmed or confirming control sits at the end of the track, and stays
     there if the width changes (rotation, a resized column). The observer also
     fires once on mount, so a control that mounts confirmed is placed before
     it paints and never shows at rest first. It only ever JUMPS: a spring in
     flight is never cut short by a re-render. */
  const viewRef = useRef<View>(view);
  useLayoutEffect(() => {
    viewRef.current = view;
    if (confirmedProp) {
      measure();
      x.jump(maxRef.current);
    }
  }, [view, confirmedProp, measure, x]);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const settle = () => {
      measure();
      if (viewRef.current === "confirming" || viewRef.current === "confirmed") x.jump(maxRef.current);
    };
    settle();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(settle);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure, x]);

  /* Auto-reset, for a non-money action only. */
  useEffect(() => {
    if (state !== "confirmed" || autoResetDelay === undefined || autoResetDelay <= 0) return;
    const t = window.setTimeout(() => {
      setState("idle");
      fly(0);
    }, autoResetDelay);
    return () => window.clearTimeout(t);
  }, [state, autoResetDelay, fly]);

  /* Arming, for a money action's keyboard path (rule 3). */
  const disarm = useCallback(
    (settle: boolean) => {
      if (!armedRef.current) return;
      armedRef.current = false;
      setArmed(false);
      if (settle) fly(0);
    },
    [fly],
  );
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => disarm(true), ARM_MS);
    return () => window.clearTimeout(t);
  }, [armed, disarm]);

  const commit = useCallback(async () => {
    armedRef.current = false;
    setArmed(false);
    setFailure(null);
    setState("confirming");
    fly(maxRef.current || measure(), SPRING_SNAP);
    let outcome: "confirmed" | Failure;
    try {
      outcome = (await onConfirmRef.current()) === false ? "declined" : "confirmed";
    } catch (error) {
      /* A crash is not a decline: nobody decided anything, something broke,
         and for money it is worth knowing about. */
      reportClientError(error, { kind: isMoney ? "client.drag_to_confirm.money" : "client.drag_to_confirm" });
      outcome = "crashed";
    }
    if (!live.current) return;
    if (outcome === "confirmed") {
      setState("confirmed");
      /* Heavy only for a payoff (CRAFT_DOCTRINE 6): money that moved. Any
         other slide (an admin's rejection) was already felt as the medium
         beat on release, which is the commit; a second beat says nothing. */
      if (isMoney) feedback("success");
      return;
    }
    setState("idle");
    setFailure(outcome);
    /* BAD NEWS IS A CUT, NOT A SPRING (CRAFT_DOCTRINE 5, "Error: immediate").
       The refusal words live in the rest label, whose opacity follows the
       handle, so a spring home surfaced them only as the handle got back: a
       slow reveal of a refused payment. The handle jumps home, the edge turns
       at once and the words arrive in 160ms (ported.css). */
    flight.current?.stop();
    x.jump(0);
    feedback("error");
  }, [fly, measure, isMoney, x]);

  const locked = disabled || view === "confirming" || view === "confirmed";

  const onPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (locked || view !== "idle") return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    /* A return spring may still be in flight: stop it and pick up from where
       the handle currently is, so grabbing it mid-return never jumps. */
    flight.current?.stop();
    measure();
    /* A finger takes over from an armed keyboard path, from the start. */
    if (armedRef.current) {
      armedRef.current = false;
      setArmed(false);
      x.jump(0);
    }
    moved.current = false;
    drag.current = { startX: e.clientX, from: x.get() };
    setFailure(null);
    setState("dragging");
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 3) moved.current = true;
    x.set(clamp(d.from + dx, 0, maxRef.current));
  };

  const release = (cancelled: boolean) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const covered = maxRef.current > 0 ? x.get() / maxRef.current : 0;
    if (!cancelled && covered >= THRESHOLD) {
      feedback("confirm");
      void commit();
      return;
    }
    setState("idle");
    fly(0);
  };

  const onClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (locked) return;
    /* Enter, Space and a screen reader's activate arrive as `detail === 0`. */
    if (e.detail === 0) {
      /* Money: the first activation arms, the second confirms (rule 3). */
      if (isMoney && !armedRef.current) {
        armedRef.current = true;
        setArmed(true);
        setFailure(null);
        measure();
        /* A small step, so the track still reads `armedLabel` in full. */
        fly(Math.min(NUDGE, maxRef.current), SPRING_SNAP);
        feedback("select");
        return;
      }
      feedback("confirm");
      void commit();
      return;
    }
    /* A pointer click that was not a slide: show the way, do not confirm. */
    if (!moved.current && view === "idle") {
      measure();
      void fly(Math.min(NUDGE, maxRef.current), SPRING_SNAP).finished.then(() => {
        if (live.current && !drag.current) fly(0);
      });
    }
  };

  /* Holding Enter repeats the click; a held key is one press, not two. */
  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.repeat && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      return;
    }
    if (e.key === "Escape" && armedRef.current) {
      e.preventDefault();
      disarm(true);
    }
  };

  const statusLabel =
    view === "confirmed"
      ? confirmedLabel
      : view === "confirming"
        ? confirmingLabel
        : armed && armedLabel
          ? armedLabel
          : failed && errorLabel
            ? errorLabel
            : "";
  const showRest = view === "idle" || view === "dragging";

  return (
    <div
      ref={rootRef}
      className={cn("nf-dtc", className)}
      data-state={view}
      data-tone={tone}
      data-money={isMoney || undefined}
      data-failed={failure ?? undefined}
      data-armed={armed || undefined}
      data-disabled={disabled || undefined}
      aria-busy={view === "confirming" || undefined}
      data-testid={props["data-testid"]}
    >
      <span ref={fillRef} className="nf-dtc__fill" aria-hidden="true" />
      <span ref={labelRef} className="nf-dtc__label" aria-hidden="true" hidden={!showRest}>
        {armed && armedLabel ? armedLabel : failed && errorLabel ? errorLabel : label}
      </span>
      {statusLabel && !showRest ? (
        <span key={view} className="nf-dtc__label nf-dtc__label--status" aria-hidden="true">
          {statusLabel}
        </span>
      ) : null}
      <button
        ref={handleRef}
        type="button"
        className="nf-dtc__handle"
        aria-label={keyboardLabel ?? label}
        aria-disabled={locked || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => release(false)}
        onPointerCancel={() => release(true)}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onBlur={() => disarm(true)}
      >
        <UiIcon name={view === "confirmed" ? "check" : "arrow-right"} size={24} />
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {statusLabel}
      </span>
    </div>
  );
}
