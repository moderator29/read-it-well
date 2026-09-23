import { getDictionary } from "@vallo/i18n";
import { WalletDeck } from "@/app/(app)/wallet/WalletDeck";
import { BALANCE_MINOR, BREAKDOWN, CARDS, ENTRIES } from "../../../e/fixtures";

/** The withdraw sheet open on arrival, as `?action=withdraw` opens it. */
export default function SweepWithdraw() {
  const t = getDictionary("en");
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <WalletDeck locale="en" copy={t.wallet.home} balanceMinor={BALANCE_MINOR} entries={ENTRIES} breakdown={BREAKDOWN} live cards={CARDS} initialAction="withdraw" />
    </div>
  );
}
