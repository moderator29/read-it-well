"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import type { Locale } from "@vallo/i18n/core";
import "@/app/css/pay-stage.css";
import { Sheet } from "@/components/ui/Sheet";
import { Amount } from "@/components/ui/Amount";
import { Button, ButtonLink } from "@/components/ui/Button";
import { IconPlate, ICON_PLATE_GLYPH } from "@/components/ui/IconPlate";
import { SuccessBody, useMomentState, type SuccessMomentProps } from "@/components/ui/SuccessSheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { feedback } from "@/lib/ui/feedback";
import { motionQuiet } from "@/lib/motion/gate";
import { PaymentSteps, type PaymentStep } from "./PaymentSteps";

/**
 * THE PAY STAGE: ONE CONTAINER FROM "PAY" TO "IT IS DONE" (round 5, the money
 * moment; MOTION_SYSTEM 2 "payoff moments" and "money, where motion must
 * never mislead"; references 7076, 7080, 7082 and the founder's
 * `payment-status.tsx`, whose one card changes its badge in one slot).
 *
 * WHAT IT REPLACES. A payment used to be four containers: the panel's own
 * pending sheet, the checkout's pending sheets (stacked on top of the first
 * while the bank window loaded), then a success card that scaled in from
 * nowhere. Each swap made a person re-find the amount they had just paid.
 *
 * One card now, the success card's geometry (the whole screen on a phone).
 * Its FACE changes and the card does not:
 *
 *   committing  the tap became this. It grows out of the tapped control
 *               (transform-origin at the button, `land` 620ms: deliberate)
 *   processing  the same card; the steps tick only as each really completes
 *   paid        the same card again: the halo and the amount hold still, the
 *               object lands in the slot the pending plate held, the seal
 *               pops at 620ms with ONE success haptic, and the receipt rows
 *               print down from under the amount once the pop has settled
 *   unknown     the honest middle (no answer, or charged and not yet
 *               applied). No haptic: a passive state does not vibrate
 *   failed      a direct cut. Nothing animates, the card appears in 160ms if
 *               it was not already up, ONE error haptic, the next action first
 *
 * THE RULE THE TYPE CARRIES. `paid` needs `settled: true`, which a caller can
 * only write where its server said so. The amount is the stage's own prop and
 * is drawn the same way in every face, so it never counts and never moves:
 * the figure is the subject and it was already true before it was paid.
 *
 * Quiet readers (reduced motion, Calm, Off): no growth and no payoff motion;
 * each face change is a 160ms fade of the verdict (Off: instant), so
 * committed, processing and done still arrive in that order.
 */

export type StageAction = { label: string; href?: string; onClick?: () => void; tone: "primary" | "quiet" };
type Actions = readonly [StageAction] | readonly [StageAction, StageAction];

export type StageFace =
  | {
      at: "committing" | "processing";
      verdict: string;
      consequence: string;
      steps?: readonly PaymentStep[];
      /** The no-double-charge line (7076), under the steps. */
      note?: string;
    }
  | { at: "unknown" | "failed"; verdict: string; consequence: string; actions: Actions }
  | {
      at: "paid";
      /** Only the server's word writes this. */
      settled: true;
      moment: Omit<SuccessMomentProps, "amount" | "haptic" | "testId">;
    };

export type StageAmount = { minorUnits: number; currency?: string; locale?: Locale };

/** Where the stage grows from: the tapped control's box, in viewport pixels. */
export type StageOrigin = { left: number; top: number; width: number; height: number };

export function stageOrigin(el: Element | null | undefined): StageOrigin | null {
  if (!el) return null;
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

const verdictOf = (face: StageFace) => (face.at === "paid" ? face.moment.title : face.verdict);

export function PaymentStage({
  face,
  amount,
  origin = null,
  onClose,
  testId = "pay-stage",
}: {
  /** Null closes the stage. */
  face: StageFace | null;
  /** Absent when the page has no figure yet: nothing is drawn rather than a zero. */
  amount?: StageAmount;
  /** Used by the committing face only: what the tap became. */
  origin?: StageOrigin | null;
  onClose(): void;
  testId?: string;
}) {
  /* The face the card was last given, so a leaving card keeps its words. */
  const [last, setLast] = useState<StageFace | null>(face);
  if (face && face !== last) setLast(face);
  const shown = face ?? last;
  const at = shown?.at;
  const paid = face?.at === "paid";
  const variant = shown?.at === "paid" ? (shown.moment.variant ?? "success") : "success";
  /* Decided once, at mount, never a frame late: this card is already on
     screen when the news arrives, so a frame of the settled picture before
     the payoff starts would be a visible flash. */
  const [quiet] = useState(() => typeof window === "undefined" || motionQuiet());
  /* The success haptic lands with the seal (PAYOFF_MS), once per payoff. */
  const { announced } = useMomentState(paid, variant, undefined);
  const primaryRef = useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);
  const settledFace = at === "paid" || at === "failed" || at === "unknown";

  /* One error pattern, felt the moment the failure is known. */
  const failed = face?.at === "failed";
  useEffect(() => {
    if (failed) feedback("error");
  }, [failed]);

  /* An answer moves focus to what to do next; a wait leaves it alone. Keyed
     on the face's kind, not its object, so a re-render never steals focus. */
  const liveAt = face?.at ?? null;
  useEffect(() => {
    if (!liveAt || !settledFace) return;
    const id = window.setTimeout(() => primaryRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [liveAt, settledFace]);

  if (!shown) return null;
  const blocking = at === "committing" || at === "processing";

  return (
    <Sheet
      open={face !== null}
      onOpenChange={(next) => {
        if (!next && !blocking) onClose();
      }}
      title={verdictOf(shown)}
      hideTitle
      card
      className={`nf-success-card nf-pay-stage${at === "failed" ? " nf-pay-stage--cut" : ""}`}
      /* Once paid, this card IS the success sheet, and says so to the suites
         that look for one (lib/ui/success-wiring.dom.test.tsx). */
      testId={at === "paid" ? "success-sheet" : testId}
    >
      {shown.at === "paid" ? (
        <SuccessBody
          {...shown.moment}
          amount={amount}
          variant={variant}
          layout="sheet"
          quiet={quiet}
          announced={announced}
          onDone={onClose}
          primaryRef={primaryRef}
          staged
        />
      ) : (
        <WaitFace face={shown} amount={amount} origin={shown.at === "committing" ? origin : null} primaryRef={primaryRef} />
      )}
    </Sheet>
  );
}

function WaitFace({
  face,
  amount,
  origin,
  primaryRef,
}: {
  face: Exclude<StageFace, { at: "paid" }>;
  amount?: StageAmount;
  origin: StageOrigin | null;
  primaryRef: Ref<HTMLButtonElement | HTMLAnchorElement | null>;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  /* The growth's origin, in the face's own unscaled box. Read from the box's
     centre, which a scale about the centre does not move. */
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !origin) return;
    const box = el.getBoundingClientRect();
    const x = origin.left + origin.width / 2 - (box.left + box.width / 2 - el.offsetWidth / 2);
    const y = origin.top + origin.height / 2 - (box.top + box.height / 2 - el.offsetHeight / 2);
    el.style.setProperty("--nf-stage-ox", `${Math.round(x)}px`);
    el.style.setProperty("--nf-stage-oy", `${Math.round(y)}px`);
  }, [origin]);

  const bad = face.at === "failed";
  return (
    <div ref={ref} className="nf-success nf-pay-stage__face" data-at={face.at} data-grow={origin ? "" : undefined}>
      <div className="nf-success__stage">
        <div className="nf-success__mark" aria-hidden="true">
          {/* A failure does not glow (ResultSheet's rule): no halo behind it. */}
          {bad ? null : <span className="nf-success__halo" />}
          <IconPlate size="lg" tone={bad ? "error" : "pending"}>
            <UiIcon name={bad ? "close" : "history"} size={ICON_PLATE_GLYPH.lg} />
          </IconPlate>
        </div>
        <div className="nf-success__words" role={bad ? "alert" : "status"} aria-atomic="true">
          {/* Keyed by the words: a new verdict is a new status, and it fades
              in (a failure is cut in, see success.css). */}
          <p key={face.verdict} className="nf-success__title nf-pay-stage__title" data-testid="pay-stage-verdict">
            {face.verdict}
          </p>
          <p className="nf-success__body">{face.consequence}</p>
        </div>
        {amount ? (
          <p className="nf-success__amount nf-numeric" data-testid="pay-stage-amount">
            <Amount
              minorUnits={amount.minorUnits}
              currency={amount.currency}
              locale={amount.locale}
              showFraction
              secondaryClassName="nf-money-kobo"
            />
          </p>
        ) : null}
        {"steps" in face && face.steps ? (
          <div className="nf-pay-stage__steps">
            <PaymentSteps steps={face.steps} label={face.verdict} />
          </div>
        ) : null}
        {"note" in face && face.note ? <p className="nf-pay-stage__note">{face.note}</p> : null}
      </div>
      {"actions" in face ? (
        <div className="nf-success__actions">
          {face.actions.map((action) => {
            const primary = action.tone === "primary";
            const ref = primary ? primaryRef : undefined;
            const variant = primary ? "primary" : "ghost";
            return action.href ? (
              <ButtonLink
                key={action.label}
                ref={ref as Ref<HTMLAnchorElement>}
                href={action.href}
                variant={variant}
                size="lg"
                full
                onClick={action.onClick}
              >
                {action.label}
              </ButtonLink>
            ) : (
              <Button
                key={action.label}
                ref={ref as Ref<HTMLButtonElement>}
                type="button"
                variant={variant}
                size="lg"
                full
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
