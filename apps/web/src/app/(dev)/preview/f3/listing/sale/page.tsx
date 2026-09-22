import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { Section, Stack } from "@/components/app/Screen";
import { ListingPurchase } from "@/components/app/listing/ListingPurchase";
import { SALE } from "../../fixtures";

/**
 * WHAT IT WILL ACTUALLY COST TO BUY, where `/listing/[id]` mounts it.
 *
 * The live route needs a database and this box reaches none, so the harness is
 * the only production surface that can photograph this block. A preview is not
 * the route, and that is said here rather than glossed: the component, the
 * dictionary and the classes are the route's, the data is a fixture.
 *
 * THREE INSTANCES ON PURPOSE, because the block exists to show a DIFFERENCE
 * and one instance can only show one side of it.
 *
 *   1. The fixture as it stands declares the asking price, the agency fee and
 *      the legal fee and says nothing about Governor's consent, stamp duty or
 *      survey and registration. Three figures, three "Not declared", and a
 *      total labelled "Buy from" because the lister named no total.
 *
 *   2. The same listing with a DECLARED ZERO agency fee draws "No agency fee"
 *      in the success ink rather than a nought nobody reads. That line is the
 *      direct-from-owner argument in one sentence and it is the single most
 *      important pixel on this page.
 *
 *   3. The same listing with everything declared, including a stated total
 *      above the parts, which is what a seller who has done the arithmetic
 *      honestly looks like. The label becomes "Total to buy" rather than
 *      "Buy from", and no line says "Not declared".
 */
export default async function ListingSalePreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main className="mx-auto max-w-5xl">
      <Stack>
        <Section title={t.purchase.title} description={t.purchase.lede} divided>
          <ListingPurchase listing={SALE} locale={locale} t={t} />
        </Section>

        <Section title="The same listing, sold by its owner" divided>
          <ListingPurchase
            listing={{ ...SALE, saleAgencyFeeMinor: 0 }}
            locale={locale}
            t={t}
          />
        </Section>

        <Section title="The same listing, with every cost declared" divided>
          <ListingPurchase
            listing={{
              ...SALE,
              governorsConsentFeeMinor: 5_000_000_00,
              stampDutyMinor: 1_500_000_00,
              surveyRegistrationFeeMinor: 500_000_00,
              /* Above the parts rather than equal to them, because the parts
                 that were itemised are never all the parts. The database holds
                 this figure and the block never recomputes it. */
              purchaseCostMinor: 206_000_000_00,
              purchaseCostStated: true,
            }}
            locale={locale}
            t={t}
          />
        </Section>
      </Stack>
    </main>
  );
}
