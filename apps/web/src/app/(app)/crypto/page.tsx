import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { CryptoMarket } from "@/components/app/crypto/CryptoMarket";
import { isYellowCardConfigured } from "@/lib/payments/yellowcard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).crypto.title };
}

/**
 * /crypto. The market surface in the side drawer: prices, movers, pairs,
 * and the entry to fund the wallet with crypto. Display only.
 *
 * The market feed is read on the client from BD's proxy, so the page shell
 * arrives at once and the four feed states are drawn by the surface. The
 * one server decision here is whether the Yellow Card keys exist, because
 * that answer must never reach a browser as an environment variable.
 */
export default async function CryptoPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return (
    <div className="nf-crypto-surface mx-auto max-w-2xl">
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
      <CryptoMarket locale={locale} copy={t.crypto} cryptoEnabled={isYellowCardConfigured()} />
    </div>
  );
}
