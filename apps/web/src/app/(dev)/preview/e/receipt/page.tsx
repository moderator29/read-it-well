import { PageHeader } from "@/components/app/PageHeader";
import { Receipt } from "@/components/app/wallet/Receipt";
import { ENTRIES } from "../fixtures";

/**
 * The receipt, including the row that says what the money was for.
 *
 * Two receipts rather than one, because the row is the whole point of R3's
 * F-09 and it only appears on a payment whose reference resolves: the first
 * is a booking payment with its stay resolved, the second is the transfer
 * that resolves to nothing and therefore draws no row at all. The live page
 * resolves it from the ledger (see `paid-for.ts`); here it is a fixture, so
 * the LOOK is provable without a session, never the read.
 */
export default function PreviewReceipt() {
  return (
    <div className="nf-money mx-auto max-w-lg">
      <PageHeader title="Receipt" fallback="/wallet/transactions" />
      <Receipt
        entry={ENTRIES[2]!}
        locale="en"
        paidFor={{
          listingId: "00000000-0000-4000-8000-00000000f321",
          title: "Grand Vista Hotel",
          when: "Fri 2 Oct to Mon 5 Oct",
          period: null,
          kind: "stay",
        }}
      />
      <div className="mt-block">
        <Receipt entry={ENTRIES[0]!} locale="en" />
      </div>
    </div>
  );
}
