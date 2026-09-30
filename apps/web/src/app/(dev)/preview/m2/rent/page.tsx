import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { rentCountdown } from "@/lib/tenancy/countdown";
import { RentCountdown } from "@/components/app/tenancy/RentCountdown";

/**
 * B10: the rent countdown card in its three shapes, from fixtures: months
 * away with the set-aside arithmetic, the renewal offer's figure, and under
 * two months (date and figure only).
 */
export const dynamic = "force-dynamic";

export default async function PreviewRentCountdown() {
  const locale: Locale = await getLocale();
  const copy = getDictionary(locale).memberKit.rentCountdown;
  const today = "2026-09-30";
  const a = rentCountdown({ today, endsOn: "2027-05-02", rentMinor: 250_000_000 })!;
  const b = rentCountdown({ today, endsOn: "2027-09-30", rentMinor: 250_000_000, offerRentMinor: 300_000_000 })!;
  const c = rentCountdown({ today, endsOn: "2026-11-20", rentMinor: 180_000_000 })!;
  return (
    <main className="nf-page nf-md grid gap-md px-gutter pb-section">
      <h1 className="nf-h2">Rent countdown (Example)</h1>
      <RentCountdown countdown={a} endsOnLabel="2 May 2027" copy={copy} locale={locale} href="/bookings" />
      <RentCountdown countdown={b} endsOnLabel="30 September 2027" copy={copy} locale={locale} />
      <RentCountdown countdown={c} endsOnLabel="20 November 2026" copy={copy} locale={locale} />
    </main>
  );
}
