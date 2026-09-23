import { getDictionary } from "@vallo/i18n";
import { RecentActivity } from "@/components/app/wallet/RecentActivity";
import { WalletSettingsSheet } from "@/components/app/wallet/WalletSettingsSheet";
import { WalletDeck } from "@/app/(app)/wallet/WalletDeck";
import { BALANCE_MINOR, BREAKDOWN, CARDS, ENTRIES } from "../../e/fixtures";

/** Mirrors app/(app)/wallet/page.tsx with fixture props. */
export default function WalletHarness() {
  const t = getDictionary("en");
  const copy = t.wallet.home;
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <WalletDeck
        locale="en"
        copy={copy}
        balanceMinor={BALANCE_MINOR}
        entries={ENTRIES}
        breakdown={BREAKDOWN}
        live
        cards={CARDS}
        settings={<WalletSettingsSheet
                card={{ title: copy.settingsLink, sub: copy.quickSettingsSub }}
                heading={copy.settingsHeading}
              />}
      />
      <div className="nf-wallet-section">
        <RecentActivity entries={ENTRIES} locale="en" copy={copy} />
      </div>
    </div>
  );
}
