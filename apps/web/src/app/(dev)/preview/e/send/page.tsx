"use client";

import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import type { RecipientLookup } from "@/app/(app)/wallet/send/recipient-action";
import { BALANCE_MINOR } from "../fixtures";
import { SeedRecents } from "./SeedRecents";

/**
 * The send surface, with the recipient resolved and an amount entered, which
 * is the state the governing image is judged in.
 *
 * WHY THE LOOKUP IS A FIXTURE HERE. The real one is a server action against
 * the accounts table and this sandbox reaches no database, so live it can
 * only answer "unknown" and the found card, which is the element the render
 * is judged on, never appears in its own proof. The resolver below answers
 * the way the real one answers for an address that exists; everything else
 * on the page, including the transfer itself, is the real component wired to
 * the real action.
 */
const FOUND: RecipientLookup = { state: "found", name: "Adeola Okonkwo" };

async function previewLookup(): Promise<RecipientLookup> {
  return FOUND;
}

export default function PreviewSend() {
  const copy = getDictionary("en").walletSend;
  return (
    <div className="nf-money mx-auto max-w-2xl">
      <PageHeader
        title={copy.title}
        subtitle={copy.tagline}
        fallback="/wallet"
        actions={
          <span className="nf-money-hero__object block" aria-hidden="true">
            <BrandIcon name="transfer-arrow" fill priority />
          </span>
        }
      />
      <SeedRecents />
      <SendFlow
        balanceMinor={BALANCE_MINOR}
        locale="en"
        copy={copy}
        initialEmail="adeola.o@example.com"
        initialAmount="25000"
        lookup={previewLookup}
      />
    </div>
  );
}
