import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { WalletDeck } from "@/app/(app)/wallet/WalletDeck";
import { BALANCE_MINOR, BREAKDOWN, CARDS, ENTRIES } from "../fixtures";

/** The Top Up sheet open on arrival, offering the saved card. */
export default function PreviewWalletTopUp() {
  const t = getDictionary("en");
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <PageHeader title={t.nav.wallet} />
      <WalletDeck
        locale="en"
        copy={t.wallet.home}
        balanceMinor={BALANCE_MINOR}
        entries={ENTRIES}
        breakdown={BREAKDOWN}
        live
        cards={CARDS}
        initialAction="fund"
      />
    </div>
  );
}
