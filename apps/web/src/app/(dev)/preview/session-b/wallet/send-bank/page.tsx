"use client";

import { getDictionary } from "@vallo/i18n";
import { BackButton } from "@/components/site/BackButton";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import type { LoadBanks, ResolveBank } from "@/components/app/wallet/BankRecipient";
import { BALANCE_MINOR } from "../../../e/fixtures";

/**
 * The send-to-bank side (founder item 3) with an account number and a bank
 * chosen and the bank's answer in. The resolver is a fixture that answers as
 * the payout side's `resolveBankAccount` does for an account that exists; the
 * real one is a paid Paystack call this harness does not make.
 */
const resolveBank: ResolveBank = async () => ({ ok: true, data: { accountName: "ADEOLA OKONKWO" } });
const loadBanks: LoadBanks = async () => ({ ok: true, data: [] });

export default function SendBankHarness() {
  const t = getDictionary("en");
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <div className="nf-wallet-backrow">
        <BackButton fallback="/wallet" className="nf-wallet-back" />
      </div>
      <SendFlow
        balanceMinor={BALANCE_MINOR}
        locale="en"
        copy={t.walletSend}
        homeCopy={t.wallet.home}
        initialMode="bank"
        initialAmount="10000"
        resolveBank={resolveBank}
        loadBanks={loadBanks}
      />
    </div>
  );
}
