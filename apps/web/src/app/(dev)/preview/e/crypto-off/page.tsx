import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CryptoMarket } from "@/components/app/crypto/CryptoMarket";
import { UNCONFIGURED, UNCONFIGURED_PAIRS } from "../fixtures";

/** The resting state until the founder's key lands. */
export default function PreviewCryptoOff() {
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
      <CryptoMarket
        locale="en"
        copy={t.crypto}
        cryptoEnabled={false}
        initial={UNCONFIGURED}
        initialPairs={UNCONFIGURED_PAIRS}
        live={false}
      />
    </div>
  );
}
