"use client";

import { getDictionary } from "@vallo/i18n";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import type { RecipientLookup } from "@/app/(app)/wallet/send/recipient-action";
import { BALANCE_MINOR } from "../../../e/fixtures";

/**
 * Mirrors app/(app)/wallet/send/page.tsx with fixture props. The recipient
 * lookup is a fixture that answers "found", because the real one needs a
 * database this harness does not reach.
 */
async function lookup(): Promise<RecipientLookup> {
  return { state: "found", name: "Adeola Okonkwo" };
}

export default function SendHarness() {
  const t = getDictionary("en");
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <SendFlow balanceMinor={BALANCE_MINOR} locale="en" copy={t.walletSend} homeCopy={t.wallet.home} lookup={lookup} />
    </div>
  );
}
