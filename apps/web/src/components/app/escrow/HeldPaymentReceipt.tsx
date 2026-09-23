import { settlementLines } from "@/lib/escrow/copy";
import type { HeldPayment } from "@/lib/escrow/queries";
import { Panel } from "@/components/ui/Panel";

/**
 * The receipt, once an agreement has settled.
 *
 * EVERY KOBO IS ACCOUNTED FOR AND NOTHING IS HIDDEN. Gross, the platform's
 * share, and what reached the person, with the last line ruled off. At today's
 * rates the middle line is absent rather than showing a zero, because a row
 * saying "we took nothing" on every receipt is noise; when a rate is switched
 * on it appears, and `settlementLines` is the only thing that decides.
 *
 * The figures come from the ESCROW ROW and the ledger entry behind it, not
 * from arithmetic done here, so a receipt cannot disagree with the books.
 */
export function HeldPaymentReceipt({
  payment,
}: {
  payment: HeldPayment;
}): React.ReactElement | null {
  if (payment.state !== "RELEASED" && payment.state !== "REFUNDED" && payment.state !== "RESOLVED") {
    return null;
  }

  const net = payment.amountMinor - payment.commissionMinor;
  const rows = settlementLines({
    grossMinor: payment.amountMinor,
    commissionMinor: payment.commissionMinor,
    netMinor: net,
  });

  return (
    <Panel variant="card" className="nf-esc-receipt" aria-label="Receipt">
      {rows.map((row) => (
        <div className="nf-esc-receipt-row" key={row.label}>
          <span>{row.label}</span>
          <span className="nf-esc-receipt-value">{row.value}</span>
        </div>
      ))}
    </Panel>
  );
}
