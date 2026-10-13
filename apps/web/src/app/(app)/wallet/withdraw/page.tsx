import type { Metadata } from "next";
import { ACTION_LABEL } from "@/lib/money/balance-copy";
import { WalletRoute } from "../WalletRoute";

export const metadata: Metadata = { title: ACTION_LABEL.withdraw, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** /wallet/withdraw: the amount, the bank account, the quote, slide to withdraw, the waiting room (D81). */
export default function WalletWithdrawPage() {
  return <WalletRoute screen="withdraw" path="/wallet/withdraw" title={ACTION_LABEL.withdraw} />;
}
