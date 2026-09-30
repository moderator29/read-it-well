import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ReplyTimeText } from "@/components/app/listing/ReplyTimeLine";
import { PriceContextView } from "@/components/app/listing/PriceContextRow";
import { priceCheckHref, subjectForListing } from "@/lib/price-check/listing-context";

/**
 * B7 and B8 on the listing, from fixtures: the reply-time line in each band
 * and the Price Check door. On the live listing both are gated by real reads
 * (at least 8 conversations; the gate answering), so neither can be seen on
 * this project's example listings, which is the point.
 */
export const dynamic = "force-dynamic";

export default async function PreviewListingLines() {
  const locale: Locale = await getLocale();
  const kit = getDictionary(locale).memberKit;
  const subject = subjectForListing({
    id: "00000000-0000-4000-8000-00000000a001",
    kind: "apartment",
    area: "Yaba",
    city: "Lagos",
    stateCode: "LA",
    lat: 6.5095,
    lng: 3.3711,
    intent: "rent",
    pricePeriod: "year",
    bedrooms: 2,
    isDemo: false,
  })!;
  return (
    <main className="nf-page nf-md px-gutter pb-section">
      <h1 className="nf-h2">Listing lines (Example)</h1>
      <section className="mt-block">
        <p className="nf-section-label">B7 reply time</p>
        <ReplyTimeText text={kit.replyTime.hour} how={kit.replyTime.how} explain={kit.replyTime.explain} />
        <ReplyTimeText text={kit.replyTime.hours} how={kit.replyTime.how} explain={kit.replyTime.explain} />
        <ReplyTimeText text={kit.replyTime.day} how={kit.replyTime.how} explain={kit.replyTime.explain} />
      </section>
      <section className="mt-block">
        <p className="nf-section-label">B8 price context</p>
        <PriceContextView href={priceCheckHref(subject)} title={kit.priceContext.title} sub={kit.priceContext.sub.replace("{count}", "7")} />
      </section>
    </main>
  );
}
