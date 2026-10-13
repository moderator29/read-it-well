import type { Metadata } from "next";
import { WALLET_SETTINGS_TITLE } from "@/lib/money/balance-copy";
import { WalletRoute } from "../WalletRoute";

export const metadata: Metadata = { title: WALLET_SETTINGS_TITLE, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** /wallet/settings: the tools and settings behind the Wallet's gear (D81; the brief, section 5). */
export default function WalletSettingsPage() {
  return <WalletRoute screen="settings" path="/wallet/settings" title={WALLET_SETTINGS_TITLE} />;
}
