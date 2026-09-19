import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { MoveInLedger } from "@/app/(app)/rent/move-in/[listingId]/MoveInLedger";
import { areaComparison, ledgerLines } from "@/app/(app)/rent/move-in/[listingId]/ledger-model";
import { RENTAL, SHELF } from "../fixtures";

/**
 * The move-in ledger with the fixture rental. The comparison is computed by
 * the same function the route uses, over fixture peers in the same area, so
 * the card appears here for the same reason it would appear live: three or
 * more other rentals with a rent on the same period.
 */
export default async function MoveInPreview() {
  const locale: Locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.catalogue.ledger;
  const listing = RENTAL;
  const peers = [
    ...SHELF,
    { ...SHELF[0]!, id: "peer-1", priceMinor: 13_000_000_00, area: listing.area },
    { ...SHELF[0]!, id: "peer-2", priceMinor: 12_500_000_00, area: listing.area },
    { ...SHELF[0]!, id: "peer-3", priceMinor: 12_000_000_00, area: listing.area },
  ];
  const lines = ledgerLines(listing, t, locale);
  const total = listing.moveInCostMinor ?? lines.reduce((sum, line) => sum + line.minor, 0);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={copy.title}
        subtitle={copy.lede}
        fallback="/preview/f3/listing"
        actions={<span className="nf-detail-verified">{copy.verified}</span>}
      />
      <MoveInLedger
        listing={listing}
        lines={lines}
        totalMinor={total}
        stated={listing.moveInCostStated === true}
        comparison={areaComparison(listing, peers)}
        locale={locale}
        t={t}
        proceed={
          <div>
            <ButtonLink href="#" variant="primary" full size="lg" trailingIcon="arrow-right">
              {copy.proceed}
            </ButtonLink>
            <p className="nf-caption mt-row text-center text-[var(--nf-content-muted)]">{copy.inspectFirst}</p>
          </div>
        }
      />
    </div>
  );
}
