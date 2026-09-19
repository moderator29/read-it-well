import { getDictionary } from "@vallo/i18n";
import { PageHeader } from "@/components/app/PageHeader";
import { CoinDetail } from "@/components/app/crypto/CoinDetail";
import { COIN } from "../fixtures";

export default function PreviewCryptoCoin() {
  const t = getDictionary("en");
  return (
    <div className="nf-crypto-surface mx-auto max-w-2xl">
      <PageHeader title={t.crypto.title} fallback="/crypto" />
      <CoinDetail id="bitcoin" locale="en" copy={t.crypto} initial={COIN} live={false} />
    </div>
  );
}
