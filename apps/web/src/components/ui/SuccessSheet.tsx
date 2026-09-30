"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from "react";
import type { Locale } from "@vallo/i18n/core";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon3D } from "@/components/ui/Icon3D";
import type { Icon3DName } from "@/components/ui/icon-3d";
import { feedback, type FeedbackKind } from "@/lib/ui/feedback";
import { motionQuiet } from "@/lib/motion/gate";
import { SUCCESS_FEEL, VARIANT_OBJECT, type SuccessVariant } from "@/lib/ui/success-moments";

/**
 * THE "IT WORKED" MOMENT (docs/SUCCESS_MOMENTS.md).
 *
 * Founder reference 54 (30 September 2026,
 * `docs/design/references/2026-09-29/54-success-pin-set.jpg`): the whole
 * screen, a big object in the middle, a title and one line under it, and one
 * full-width pill at the foot. Drawn in our own hand: the soft top (section
 * 17), one of the founder's 3D objects instead of a flat badge, a soft halo
 * ring behind it and a few blue and orange sparks round it (section 18).
 *
 * TWO SHAPES, ONE BODY.
 *
 *   SuccessSheet    a dialog over whatever the person was doing. On a phone
 *                   it fills the screen; from 40rem up it is a centred card
 *                   over the dimmed page. Everything else is `Sheet`'s: the
 *                   portal, focus trap and return, Escape, Back, scroll lock.
 *   SuccessScreen   the same moment as a page's own content, for a route
 *                   whose whole job is to say it worked. Not a dialog.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT IS FOR, AND WHAT IT IS NOT FOR.
 *
 * Good news only. `ResultSheet` keeps every other state: pending, in review
 * with a horizon, failed, expired. A payment is celebrated here only once the
 * server settled it against the booking on screen; "Confirming your payment"
 * is never this component, and there is no prop that makes it one. Small
 * saves (saved, copied) keep their quiet toasts.
 *
 * ---------------------------------------------------------------------------
 * MOTION, UNDER A SECOND, THEN A GENTLE FLOAT (app/css/success.css).
 *
 *   0 to 520ms     the object pops in on a spring, the halo ring opens
 *   80 to 700ms    one ring pulses out and fades
 *   220 to 900ms   the sparks burst out on a stagger and settle
 *   340 to 900ms   the title, the line and the actions rise in
 *   after 900ms    the object floats a few pixels, for a few breaths only
 *
 * Transform and opacity only, on a handful of elements, so it stays cheap on
 * a low-end Android. Under `prefers-reduced-motion`, or the app's Calm or Off
 * setting (`motionQuiet`), the moment lands in its final state and nothing
 * moves. The stylesheet answers the same conditions on its own, so a first
 * paint before this script runs is never the animated one. The float also
 * stays off when ambient motion or data saver is off.
 *
 * ---------------------------------------------------------------------------
 * ACCESSIBILITY.
 *
 * The sheet is a real dialog named by the title; the screen carries the
 * title as its heading. The line is announced through a polite live region
 * filled one frame after opening, because a live region that arrives already
 * full is not announced by every reader. In the sheet, focus goes to the
 * primary action; the screen is a page and leaves focus where a page does.
 * The object is decorative: the words say everything.
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

/** What a moment says and shows, whichever shape it takes. */
export type SuccessMomentProps = {
  variant?: SuccessVariant;
  /**
   * The 3D object in the middle (`successCopy(...).object` names the right
   * one for a moment). Defaults by variant.
   */
  object?: Icon3DName;
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

export type SuccessSheetProps = SuccessMomentProps & {
  open: boolean;
  onOpenChange(open: boolean): void;
};

/**
 * Decided once per showing, a frame in, so a setting changed mid-animation
 * does not snap the object between states; and the live region is filled on
 * the same frame so it is announced. The haptic is felt once per showing.
 */
function useMomentState(shown: boolean, variant: SuccessVariant, haptic: FeedbackKind | false | undefined) {
  const [quiet, setQuiet] = useState(true);
  const [announced, setAnnounced] = useState(false);

  const [prevShown, setPrevShown] = useState(shown);
  if (prevShown !== shown) {
    setPrevShown(shown);
    setAnnounced(false);
  }

  useEffect(() => {
    if (!shown) return;
    const id = window.requestAnimationFrame(() => {
      setQuiet(motionQuiet());
      setAnnounced(true);
    });
    return () => window.cancelAnimationFrame(id);
  }, [shown]);

  const feel = haptic === false ? null : (haptic ?? SUCCESS_FEEL[variant]);
  useEffect(() => {
    if (shown && feel) feedback(feel);
  }, [shown, feel]);

  return { quiet, announced };
}

export function SuccessSheet({
  open,
  onOpenChange,
  variant = "success",
  haptic,
  testId = "success-sheet",
  ...moment
}: SuccessSheetProps) {
  const primaryRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const { quiet, announced } = useMomentState(open, variant, haptic);
  const close = () => onOpenChange(false);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={moment.title}
      hideTitle
      card
      className="nf-success-card"
      initialFocus={primaryRef}
      testId={testId}
    >
      <SuccessBody
        {...moment}
        variant={variant}
        layout="sheet"
        quiet={quiet}
        announced={announced}
        onDone={close}
        primaryRef={primaryRef}
      />
    </Sheet>
  );
}

/**
 * The page shape: the same moment as a route's own content. The title is the
 * page's heading. An action with neither `href` nor `onClick` does nothing
 * here, since there is no sheet to close, so give each one somewhere to go.
 */
export function SuccessScreen({
  variant = "success",
  haptic,
  testId = "success-screen",
  ...moment
}: SuccessMomentProps) {
  const primaryRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  /* No focus is moved: a page is read from its top, like any other page. */
  const { quiet, announced } = useMomentState(true, variant, haptic);

  return (
    <section className="nf-success-screen" data-testid={testId} aria-labelledby={`${testId}-title`}>
      <SuccessBody
        {...moment}
        variant={variant}
        layout="page"
        quiet={quiet}
        announced={announced}
        onDone={() => undefined}
        primaryRef={primaryRef}
        titleId={`${testId}-title`}
      />
    </section>
  );
}

function SuccessBody({
  variant,
  object,
  title,
  body,
  amount,
  details,
  primary,
  secondary,
  layout,
  quiet,
  announced,
  onDone,
  primaryRef,
  titleId,
}: Omit<SuccessMomentProps, "haptic" | "testId"> & {
  variant: SuccessVariant;
  layout: "sheet" | "page";
  quiet: boolean;
  announced: boolean;
  onDone(): void;
  primaryRef: Ref<HTMLButtonElement | HTMLAnchorElement | null>;
  titleId?: string;
}) {
  const liveId = useId();
  const run = (action: SuccessAction) => () => {
    action.onClick?.();
    onDone();
  };

  return (
    <div className="nf-success" data-variant={variant} data-layout={layout} data-quiet={quiet ? "true" : "false"}>
      <div className="nf-success__stage">
        <SuccessObject name={object ?? VARIANT_OBJECT[variant]} />

        <div className="nf-success__words">
          {layout === "page" ? (
            <h1 id={titleId} className="nf-success__title" data-testid="success-title">
              {title}
            </h1>
          ) : (
            /* The title is the dialog's own name (Sheet's hidden heading),
               which a reader announces as focus lands. Drawn for the eye only,
               so it is not read a second time. */
            <p className="nf-success__title" data-testid="success-title" aria-hidden="true">
              {title}
            </p>
          )}
          {/* The line is the news, announced politely once it is filled, a
              frame after opening; until then it is laid out and silent, so
              nothing jumps. */}
          <p id={liveId} role="status" aria-live="polite" aria-atomic="true" className="nf-success__body">
            {announced ? body : <span aria-hidden="true">{body}</span>}
          </p>
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
      </div>

      <div className="nf-success__actions">
        <ActionButton action={primary} tone="primary" onDone={onDone} run={run} ref={primaryRef} />
        {secondary ? <ActionButton action={secondary} tone="quiet" onDone={onDone} run={run} /> : null}
      </div>
    </div>
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
  const testId = tone === "primary" ? "success-primary" : "success-secondary";
  if (action.href) {
    return (
      <ButtonLink
        ref={ref as Ref<HTMLAnchorElement>}
        href={action.href}
        variant={variant}
        size="lg"
        full
        data-testid={testId}
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
    <Button ref={ref as Ref<HTMLButtonElement>} variant={variant} size="lg" full data-testid={testId} onClick={run(action)}>
      {action.label}
    </Button>
  );
}

/* ----------------------------------------------------------- the object */

/**
 * The sparks, placed by hand rather than at random so every opening is the
 * same picture and a screenshot of it is stable. Angle in degrees from the
 * top, distance in px from the centre of the object, size, stagger, and
 * whether it is one of the orange ones (section 18: a spark, never a fill;
 * three of eight).
 */
const SPARKS: readonly { kind: "star" | "dot"; tone: "blue" | "spark"; angle: number; distance: number; size: number; delay: number }[] = [
  { kind: "star", tone: "blue", angle: -52, distance: 98, size: 14, delay: 0 },
  { kind: "dot", tone: "spark", angle: -14, distance: 104, size: 7, delay: 50 },
  { kind: "dot", tone: "blue", angle: 30, distance: 100, size: 6, delay: 100 },
  { kind: "star", tone: "spark", angle: 66, distance: 94, size: 11, delay: 30 },
  { kind: "dot", tone: "blue", angle: 128, distance: 102, size: 5, delay: 140 },
  { kind: "star", tone: "blue", angle: 196, distance: 98, size: 10, delay: 70 },
  { kind: "dot", tone: "spark", angle: 238, distance: 100, size: 6, delay: 120 },
  { kind: "dot", tone: "blue", angle: 292, distance: 96, size: 7, delay: 90 },
];

function SuccessObject({ name }: { name: Icon3DName }) {
  return (
    <div className="nf-success__mark" aria-hidden="true" data-object={name}>
      <span className="nf-success__halo" />
      <span className="nf-success__pulse" />
      <span className="nf-success__pop">
        <span className="nf-success__float">
          <Icon3D name={name} size={144} className="nf-success__object" priority />
        </span>
      </span>
      {SPARKS.map((bit, i) => {
        const rad = (bit.angle * Math.PI) / 180;
        const x = Math.round(Math.sin(rad) * bit.distance);
        const y = Math.round(-Math.cos(rad) * bit.distance);
        return (
          <span
            key={i}
            className={`nf-success__bit nf-success__bit--${bit.kind}`}
            data-tone={bit.tone}
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
