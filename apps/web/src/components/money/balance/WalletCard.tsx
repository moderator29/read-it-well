import Image from "next/image";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { MomentTone } from "../kit";

/**
 * THE WALLET CARD (D81; the founder's governing reference, right-hand phone:
 * "Available Balance" with its eye, the big figure, the wallet object on the
 * right, and Total Received and Total Spent under it). D78 renames the words:
 * the caption is "Available", never "Balance".
 *
 * One card, deep navy into the Vallo blue in both themes (a night island,
 * `data-theme="dark"`), with a fine light edge. In this order and nothing
 * else: the caption with the hide toggle and Add money at the far end (where
 * the reference keeps a currency selector; Vallo has one currency, so no
 * selector), the figure or calm words in its place, one short status line,
 * the solid wallet object, and the two totals. Withdraw and Send are NOT on
 * the card: they are the two capsules at the foot of the screen (D81
 * supersedes D80's capsules in the card).
 */
export function WalletCard({
  caption,
  figure,
  empty,
  line,
  tone,
  corner,
  action,
  totals,
}: {
  /** What the figure is ("Available"). */
  caption: string;
  /** The amount, read from the provider. */
  figure?: ReactNode;
  /** In place of the figure when there is none to show: words, never a zero. */
  empty?: string;
  /** The card's state, in one short line. */
  line: string;
  /** The mark before the line; "neutral" (nothing to confirm yet) draws a clock. */
  tone: MomentTone;
  /** Beside the caption: the hide toggle, when there is a figure to hide. */
  corner?: ReactNode;
  /** At the head's end: Add money, or Try again. */
  action?: ReactNode;
  /** Money in and Money out, under the figure. */
  totals?: ReactNode;
}) {
  return (
    <section
      className="nf-mw-card"
      data-theme="dark"
      aria-labelledby="nf-mw-caption"
      data-testid="balance-card"
      data-empty={figure ? undefined : "true"}
      data-order="card"
    >
      <div className="nf-mw-card__head">
        <h2 className="nf-mw-card__caption">
          <span id="nf-mw-caption">{caption}</span>
          {corner}
        </h2>
        {action}
      </div>
      <div className="nf-mw-card__main">
        {figure ? (
          <p className="nf-mw-card__figure">{figure}</p>
        ) : (
          <p className="nf-mw-card__none" data-testid="balance-available-none">
            {empty}
          </p>
        )}
        <p className="nf-mw-card__line" role="status">
          {tone === "neutral" ? <UiIcon name="clock" size={14} /> : <span className="nf-mw-card__dot" data-tone={tone} aria-hidden="true" />}
          <span>{line}</span>
        </p>
        <Image className="nf-mw-card__art" src="/brand/tier-b/wallet-card@2x.webp" alt="" width={208} height={208} unoptimized aria-hidden="true" />
      </div>
      {totals}
    </section>
  );
}
