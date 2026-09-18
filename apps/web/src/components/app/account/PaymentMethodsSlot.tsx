import Link from "next/link";
import type { ReactNode } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { RowLink } from "./rows";

/**
 * THE PAYMENT METHODS BLOCK ON THE SETTINGS HOME, per `7F96BE6C`.
 *
 * The frame is F4's: the card, the glyph tile, the title, the line under it
 * and the Add control at the right. What sits INSIDE the frame belongs to
 * worker E, who owns `/settings/payments` and `components/app/payments`: E
 * renders the person's cards and bank accounts as `children` here, read
 * through the existing `listPaymentMethods` and `listBankAccounts` actions.
 * Until E fills it, the slot carries one honest row, the way to the payment
 * methods screen, so nothing here is a picture of a feature.
 */
export function PaymentMethodsSlot({
  title,
  sub,
  addLabel,
  manageLabel,
  children,
}: {
  title: string;
  sub: string;
  addLabel: string;
  /** The row shown while E has not filled the slot. */
  manageLabel: string;
  children?: ReactNode;
}) {
  return (
    <section className="nf-card nf-hub-pay" aria-label={title} data-testid="settings-payments-slot">
      <div className="nf-hub-pay__head">
        <span className="nf-srow__icon nf-hub__tile" aria-hidden="true">
          <UiIcon name="wallet" size={ICON.row} />
        </span>
        <span className="nf-srow__body">
          <span className="nf-srow__label">{title}</span>
          <span className="nf-srow__sub">{sub}</span>
        </span>
        <Link href="/settings/payments" className="nf-btn nf-btn--sm nf-btn--glass nf-hub-pay__add">
          <UiIcon name="plus" size={16} />
          {addLabel}
        </Link>
      </div>
      <div className="nf-hub-pay__body">
        {children ?? (
          <RowLink href="/settings/payments" icon="wallet" label={manageLabel} testId="settings-payments-row" />
        )}
      </div>
    </section>
  );
}
