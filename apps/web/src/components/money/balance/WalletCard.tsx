import type { ReactNode } from "react";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { MomentDot, type MomentTone } from "../kit";

/**
 * THE WALLET CARD (founder, 7 October: "design it to be fully clean"; D78:
 * no platinum, no grey container, no glass icon). One card on the platform's
 * own blue container (`nf-panel`, the night glass the Profile lists sit on),
 * the caption, the one figure the screen is for, and a foot that carries the
 * card's state in one short line and its one action.
 *
 * The figure slot takes whatever the screen can honestly say: the amount
 * from the provider, the hidden dots, or, with no answer to read, a calm
 * phrase in the figure's place (`empty`) that never looks like an amount.
 */
export function WalletCard({
  caption,
  figure,
  empty,
  line,
  tone,
  corner,
  action,
}: {
  caption: string;
  /** The amount, read from the provider. */
  figure?: ReactNode;
  /** In place of the figure when there is none to show: words, never a zero. */
  empty?: string;
  /** The card's state, in one short line. */
  line: string;
  /** The mark before the line; "neutral" (nothing to confirm yet) draws a clock, not an empty ring. */
  tone: MomentTone;
  corner?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className="nf-panel nf-mw-card"
      aria-labelledby="nf-mw-caption"
      data-testid="balance-card"
      data-empty={figure ? undefined : "true"}
    >
      <div className="nf-mw-card__top">
        <span className="nf-mw-card__brand" aria-hidden="true">
          <LogoMark size={20} />
        </span>
        {corner}
      </div>
      <div className="nf-mw-card__body">
        <p id="nf-mw-caption" className="nf-mw-card__caption">
          {caption}
        </p>
        {figure ? (
          <p className="nf-mw-card__figure">{figure}</p>
        ) : (
          <p className="nf-mw-card__none" data-testid="balance-available-none">
            {empty}
          </p>
        )}
      </div>
      <div className="nf-mw-card__foot">
        <span className="nf-mw-card__line" role="status">
          {tone === "neutral" ? <UiIcon name="clock" size={16} /> : <MomentDot tone={tone} size="sm" />}
          <span>{line}</span>
        </span>
        {action}
      </div>
    </section>
  );
}
