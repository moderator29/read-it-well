import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CryptoMarket } from "@/components/app/crypto/CryptoMarket";
import { MARKETS, PAIRS } from "../fixtures";

export default function PreviewCrypto() {
  const t = getDictionary("en");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.crypto.title}
        subtitle={t.crypto.lede}
        fallback="/home"
        actions={
          <span className="nf-money-hero__object block" aria-hidden="true">
            <BrandIcon name="chart-growth" fill priority />
          </span>
        }
      />
      <CryptoMarket locale="en" copy={t.crypto} cryptoEnabled={false} initial={MARKETS} initialPairs={PAIRS} live={false} />
    </div>
  );
}
