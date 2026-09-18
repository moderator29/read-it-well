import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { CoinDetail } from "@/components/app/crypto/CoinDetail";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).crypto.title, robots: { index: false, follow: false } };
}

/**
 * /crypto/[id]. One coin, read on the client from BD's proxy. The header
 * names the surface; the coin names itself once the feed answers, so the
 * page never claims a coin it has not read.
 */
export default async function CoinPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, locale] = await Promise.all([params, getLocale()]);
  const t = getDictionary(locale);
  const safeId = id.slice(0, 80);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.crypto.title} fallback="/crypto" />
      <CoinDetail id={safeId} locale={locale} copy={t.crypto} />
    </div>
  );
}
