import type { Metadata } from "next";
import { ACTION_LABEL } from "@/lib/money/balance-copy";
import { WalletRoute } from "../WalletRoute";

export const metadata: Metadata = { title: ACTION_LABEL.add, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** /wallet/add: the amount, the method, Continue, the provider's payment page, the waiting room (D81, the Supay reference). */
export default function WalletAddMoneyPage() {
  return <WalletRoute screen="add" path="/wallet/add" title={ACTION_LABEL.add} />;
}
