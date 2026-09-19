import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { SendFlow } from "@/components/app/wallet/SendFlow";
import { BALANCE_MINOR } from "../fixtures";
import { SeedRecents } from "./SeedRecents";

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
      <SendFlow balanceMinor={BALANCE_MINOR} locale="en" copy={copy} />
    </div>
  );
}
