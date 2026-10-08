import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MomentTone } from "../kit";

/**
 * THE WALLET CARD (the founder, 8 October: "not really premium!! I need
 * something more premium looks and clean UX... the withdrawal and transfer
 * button should be capsule each okay and glass too and make the whole vibes
 * clean"; D78: blue is the identity, no platinum, no glass icon).
 *
 * One card, deep navy into the Vallo blue in both themes (a night island,
 * `data-theme="dark"`, so every token inside it resolves in the night
 * palette), with a fine light edge and one soft highlight. Inside it, in
 * this order and nothing else: the name ("Wallet") with the card's one solid
 * action at its end, the figure the screen is for, one short status line,
 * and the move-money capsules (`children`), which are frosted glass over the
 * blue.
 *
 * The figure slot takes whatever the screen can honestly say: the amount
 * from the provider, the hidden dots, or, with no answer to read, a calm
 * phrase in the figure's place (`empty`) that never looks like an amount.
 */
export function WalletCard({
  name,
  caption,
  figure,
  empty,
  line,
  tone,
  corner,
  action,
  children,
}: {
  /** The card's name, "Wallet". */
  name: string;
  /** What the figure is ("Available"), shown only above a figure. */
  caption: string;
  /** The amount, read from the provider. */
  figure?: ReactNode;
  /** In place of the figure when there is none to show: words, never a zero. */
  empty?: string;
  /** The card's state, in one short line. */
  line: string;
  /** The mark before the line; "neutral" (nothing to confirm yet) draws a clock, not an empty ring. */
  tone: MomentTone;
  /** Beside the caption: the hide toggle, when there is a figure to hide. */
  corner?: ReactNode;
  /** At the end of the name row: Add money, or Try again. */
  action?: ReactNode;
  /** The move-money capsules at the foot of the card. */
  children?: ReactNode;
}) {
  return (
    <section
      className="nf-mw-card"
      data-theme="dark"
      aria-labelledby="nf-mw-name"
      data-testid="balance-card"
      data-empty={figure ? undefined : "true"}
    >
      <div className="nf-mw-card__top">
        <h2 id="nf-mw-name" className="nf-mw-card__name">
          {name}
        </h2>
        {action}
      </div>
      <div className="nf-mw-card__body">
        {figure ? (
          <>
            <div className="nf-mw-card__caption">
              <span id="nf-mw-caption">{caption}</span>
              {corner}
            </div>
            <p className="nf-mw-card__figure">{figure}</p>
          </>
        ) : (
          <p className="nf-mw-card__none" data-testid="balance-available-none">
            {empty}
          </p>
        )}
        <p className="nf-mw-card__line" role="status">
          {tone === "neutral" ? (
            <UiIcon name="clock" size={16} className="nf-mw-card__clock" />
          ) : (
            <span className="nf-mw-card__dot" data-tone={tone} aria-hidden="true" />
          )}
          <span>{line}</span>
        </p>
      </div>
      {children}
    </section>
  );
}
