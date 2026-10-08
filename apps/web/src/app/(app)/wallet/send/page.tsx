import type { Metadata } from "next";
import { ACTION_LABEL } from "@/lib/money/balance-copy";
import { WalletRoute } from "../WalletRoute";

export const metadata: Metadata = { title: ACTION_LABEL.send, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** /wallet/send: the amount, who it goes to, what it is for, the quote, slide to send, the waiting room (D81, the Supay reference). */
export default function WalletSendPage() {
  return <WalletRoute screen="send" path="/wallet/send" title={ACTION_LABEL.send} />;
}
