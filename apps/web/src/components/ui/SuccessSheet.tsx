"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { Button, ButtonLink } from "@/components/ui/Button";
import { feedback, type FeedbackKind } from "@/lib/ui/feedback";
import { motionQuiet } from "@/lib/motion/gate";
import { SUCCESS_FEEL, type SuccessVariant } from "@/lib/ui/success-moments";

/**
 * THE "IT WORKED" MOMENT (docs/SUCCESS_MOMENTS.md).
 *
 * A centred card over the page (the founder's reference, 29 September 2026:
 * `docs/design/references/2026-09-29/15-success-modal.png`): a big mark in a
 * soft circle, a burst of sparkles and dots, one title, one line, the facts
 * worth keeping, and one full-width action.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS FOR, AND WHAT IT IS NOT FOR.
 *
 * Good news only. `ResultSheet` keeps every other state: pending, in review
 * with a horizon, failed, expired. A payment is celebrated here only once the
 * server settled it against the booking on screen; "Confirming your payment"
 * is never this component, and there is no prop that makes it one.
 *
 * ---------------------------------------------------------------------------
 * THE THREE VARIANTS.
 *
 *   success     a tick: paid, booked, confirmed
 *   submitted   a clock with a tick badge: accepted, and a person decides next
 *   approved    a seal with a tick: somebody else decided in your favour
 *
 * ---------------------------------------------------------------------------
 * MOTION, UNDER 900MS AND ONLY ONCE.
 *
 *   0 to 360ms     the soft circle scales in on the spring
 *   200 to 560ms   the mark draws (stroke-dashoffset)
 *   300 to 860ms   the sparkles and dots burst out on a stagger and settle
 *
 * Under `prefers-reduced-motion`, or the app's Calm or Off motion setting
 * (`motionQuiet`, the one answer every scripted animation here asks), the
 * card lands in its final state: mark drawn, sparkles at rest, nothing moving.
 * The stylesheet answers the same three conditions on its own, so a first
 * paint before this script runs is never the animated one.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITY.
 *
 * A real dialog on `Sheet` (focus trap, Escape, Back, scroll lock, focus
 * return), named by the title. The title and body are announced through a
 * polite live region that is filled one frame after opening, because a live
 * region that arrives already full is not announced by every reader. Focus
 * goes to the primary action.
 */

export type SuccessDetail = {
  label: string;
  value: ReactNode;
  /** A reference: monospaced, selectable in one tap, never truncated. */
  mono?: boolean;
};

export type SuccessAction = {
  label: string;
  /** Navigate. The sheet closes as it goes. */
  href?: string;
  /** Runs, then the sheet closes. With neither, the action only closes. */
  onClick?: () => void;
};

export type SuccessSheetProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  variant?: SuccessVariant;
  title: string;
  body: string;
  /** The headline figure for a money moment. */
  amount?: { minorUnits: number; currency?: string; locale?: Locale };
  /** The facts worth screenshotting: reference, date, the property. */
  details?: readonly SuccessDetail[];
  /** Usually "Continue". */
  primary: SuccessAction;
  secondary?: SuccessAction;
  /**
   * What the moment feels like in the hand (lib/ui/feedback.ts, which reaches
   * Capacitor's Haptics in the native shell). Defaults by variant; `false`
   * for a moment re-shown from a link, where nothing just happened.
   */
  haptic?: FeedbackKind | false;
  testId?: string;
};

export function SuccessSheet({
  open,
  onOpenChange,
  variant = "success",
  title,
  body,
  amount,
  details,
  primary,
  secondary,
  haptic,
  testId = "success-sheet",
}: SuccessSheetProps) {
  const primaryRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const liveId = useId();
  /* Decided once per opening, so a setting changed mid-animation does not
     snap the mark between states. */
  const [quiet, setQuiet] = useState(true);
  const [announced, setAnnounced] = useState(false);

  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    setAnnounced(false);
  }

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      setQuiet(motionQuiet());
      setAnnounced(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  /* Felt once per opening, when the outcome is known. */
  const feel = haptic === false ? null : (haptic ?? SUCCESS_FEEL[variant]);
  useEffect(() => {
    if (open && feel) feedback(feel);
  }, [open, feel]);

  const close = () => onOpenChange(false);
  const run = (action: SuccessAction) => () => {
    action.onClick?.();
    close();
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      hideTitle
      card
      className="nf-success-card"
      initialFocus={primaryRef}
      testId={testId}
    >
      <div className="nf-success" data-variant={variant} data-quiet={quiet ? "true" : "false"}>
        <SuccessMark variant={variant} />

        <div id={liveId} role="status" aria-live="polite" aria-atomic="true" className="nf-success__words">
          {announced ? (
            <>
              <p className="nf-success__title" data-testid="success-title">
                {title}
              </p>
              <p className="nf-success__body">{body}</p>
            </>
          ) : (
            /* Laid out at full size before it is filled, so nothing jumps. */
            <>
              <p className="nf-success__title" aria-hidden="true">
                {title}
              </p>
              <p className="nf-success__body" aria-hidden="true">
                {body}
              </p>
            </>
          )}
        </div>

        {amount ? (
          <p className="nf-success__amount nf-numeric" data-testid="success-amount">
            <Amount
              minorUnits={amount.minorUnits}
              currency={amount.currency}
              locale={amount.locale}
              showFraction
              secondaryClassName="nf-money-kobo"
            />
          </p>
        ) : null}

        {details && details.length > 0 ? (
          <dl className="nf-success__facts">
            {details.map((row) => (
              <div key={row.label} className="nf-success__fact">
                <dt>{row.label}</dt>
                <dd className={row.mono ? "nf-success__mono" : undefined}>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="nf-success__actions">
          <ActionButton action={primary} tone="primary" onDone={close} run={run} ref={primaryRef} />
          {secondary ? <ActionButton action={secondary} tone="quiet" onDone={close} run={run} /> : null}
        </div>
      </div>
    </Sheet>
  );
}

function ActionButton({
  action,
  tone,
  onDone,
  run,
  ref,
}: {
  action: SuccessAction;
  tone: "primary" | "quiet";
  onDone(): void;
  run(action: SuccessAction): () => void;
  ref?: Ref<HTMLButtonElement | HTMLAnchorElement | null>;
}) {
  const variant = tone === "primary" ? "primary" : "ghost";
  if (action.href) {
    return (
      <ButtonLink
        ref={ref as Ref<HTMLAnchorElement>}
        href={action.href}
        variant={variant}
        size="lg"
        full
        data-testid={tone === "primary" ? "success-primary" : "success-secondary"}
        onClick={() => {
          action.onClick?.();
          onDone();
        }}
      >
        {action.label}
      </ButtonLink>
    );
  }
  return (
    <Button
      ref={ref as Ref<HTMLButtonElement>}
      variant={variant}
      size="lg"
      full
      data-testid={tone === "primary" ? "success-primary" : "success-secondary"}
      onClick={run(action)}
    >
      {action.label}
    </Button>
  );
}

/* ------------------------------------------------------------- the mark */

/**
 * The confetti, placed by hand rather than at random so every opening is the
 * same picture and a screenshot of it is stable. Angle in degrees from the
 * top, distance in px from the centre of the 132px mark, and the stagger.
 */
const BURST: readonly { kind: "star" | "dot" | "ring"; angle: number; distance: number; size: number; delay: number }[] = [
  { kind: "star", angle: -58, distance: 66, size: 14, delay: 0 },
  { kind: "dot", angle: -20, distance: 70, size: 6, delay: 40 },
  { kind: "ring", angle: 24, distance: 68, size: 9, delay: 80 },
  { kind: "star", angle: 62, distance: 64, size: 11, delay: 20 },
  { kind: "dot", angle: 100, distance: 72, size: 5, delay: 110 },
  { kind: "star", angle: 138, distance: 66, size: 9, delay: 60 },
  { kind: "dot", angle: 176, distance: 70, size: 6, delay: 140 },
  { kind: "ring", angle: 214, distance: 66, size: 8, delay: 30 },
  { kind: "star", angle: 250, distance: 70, size: 12, delay: 90 },
  { kind: "dot", angle: 286, distance: 64, size: 5, delay: 120 },
];

function SuccessMark({ variant }: { variant: SuccessVariant }) {
  return (
    <div className="nf-success__mark" aria-hidden="true">
      <span className="nf-success__halo" />
      <svg className="nf-success__glyph" viewBox="0 0 120 120" width="120" height="120" focusable="false">
        {variant === "submitted" ? (
          <>
            <circle className="nf-success__stroke" cx="56" cy="58" r="24" pathLength={1} />
            <path className="nf-success__stroke nf-success__stroke--late" d="M56 44 V58 L66 64" pathLength={1} />
            <circle className="nf-success__badge" cx="78" cy="80" r="13" />
            <path className="nf-success__stroke nf-success__stroke--on-badge" d="M72 80 L76.5 84.5 L84.5 76" pathLength={1} />
          </>
        ) : variant === "approved" ? (
          <>
            <path className="nf-success__seal" d={SEAL} />
            <path className="nf-success__stroke" d="M45 61 L55 71 L76 49" pathLength={1} />
          </>
        ) : (
          <path className="nf-success__stroke nf-success__stroke--big" d="M40 61 L53 74 L81 45" pathLength={1} />
        )}
      </svg>
      {BURST.map((bit, i) => {
        const rad = (bit.angle * Math.PI) / 180;
        const x = Math.round(Math.sin(rad) * bit.distance);
        const y = Math.round(-Math.cos(rad) * bit.distance);
        return (
          <span
            key={i}
            className={`nf-success__bit nf-success__bit--${bit.kind}`}
            style={
              {
                "--bit-x": `${x}px`,
                "--bit-y": `${y}px`,
                "--bit-size": `${bit.size}px`,
                "--bit-delay": `${bit.delay}ms`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/** A twelve-lobed seal around the centre, drawn once at module load. */
const SEAL = (() => {
  const lobes = 12;
  const outer = 34;
  const inner = 30;
  const points: string[] = [];
  for (let i = 0; i < lobes * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / lobes - Math.PI / 2;
    points.push(`${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${points.join(" L")} Z`;
})();
