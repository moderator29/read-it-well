import type { Metadata } from "next";
import { WALLET_TABS } from "@/lib/money/balance-copy";
import { WalletRoute } from "../WalletRoute";

export const metadata: Metadata = { title: WALLET_TABS.transactions, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** /wallet/transactions: the Wallet's own history, with filters (D81; the brief, section 4). `?filter=received|added|sent|withdrawals`. */
export default async function WalletTransactionsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const { filter } = await searchParams;
  return <WalletRoute screen="transactions" path="/wallet/transactions" title={WALLET_TABS.transactions} filter={filter} />;
}
