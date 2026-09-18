import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { TrustStrip } from "@/components/app/wallet/TrustStrip";
import { WalletSettingsSheet } from "@/components/app/wallet/WalletSettingsSheet";
import { WalletDeck } from "@/app/(app)/wallet/WalletDeck";
import { BALANCE_MINOR, BREAKDOWN, CARDS, ENTRIES } from "../fixtures";

export default function PreviewWallet() {
  const t = getDictionary("en");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.nav.wallet} actions={<WalletSettingsSheet />} />
      <WalletDeck
        locale="en"
        copy={t.wallet.home}
        balanceMinor={BALANCE_MINOR}
        entries={ENTRIES}
        breakdown={BREAKDOWN}
        live
        cards={CARDS}
        cryptoEnabled
      />
      <div className="mt-block">
        <RecentActivity entries={ENTRIES} locale="en" copy={t.wallet.home} />
      </div>
      <div className="mt-block">
        <TrustStrip copy={t.wallet.home} />
      </div>
    </div>
  );
}
