import { getDictionary, type Locale } from "@vallo/i18n";
import { getListingRepository } from "@/lib/listings/repository";
import type { Listing } from "@/lib/listings/types";
import { Reveal } from "@/components/site/Reveal";
import { Words } from "@/components/site/Words";
import { Amount } from "@/components/ui/Amount";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The move-in truth band: the product's one argument, made once, with a real
 * ledger beside it.
 *
 * `PRODUCT.md` calls the move-in total the product rule. Every competitor
 * leads with the rent and lets the rest arrive at the door; Vallo prints the
 * number somebody actually pays. Until this band existed, that argument
 * appeared on the landing page as a sub-clause in a four-cell feature grid,
 * which is roughly the effort a company spends on a claim it does not mean.
 *
 * IT IS A PROOF, NOT THE SPINE, and the difference cost a rewrite to learn.
 * A version of this page put the move-in total at the top and built three of
 * its seven sections on it, and the page came out describing a service for
 * renting a flat rather than a marketplace with nine markets in it. The band
 * now sits after the markets and the account, where it does what it is good
 * at: proving how this platform behaves with one number, in one place.
 *
 * THE LEDGER IS A REAL LISTING, NOT AN ILLUSTRATION. The figures are read from
 * the catalogue at render time: the first recommended listing that carries a
 * move-in total and at least one named part. This page has already had one
 * section deleted for publishing a hardcoded "17+" under a heading that said
 * "the same real numbers", so this band is built the opposite way round: if no
 * listing can supply real arithmetic, THE LEDGER DOES NOT RENDER and the band
 * makes its argument in prose alone. A worked example with invented numbers
 * would be the same lie with more decoration.
 *
 * The rows are named in the listing's own vocabulary (caution, service,
 * agency, legal), because those are the words a Nigerian renter meets at the
 * door and recognising them is the point of the band.
 */

type LedgerRow = { label: string; minor: number };

function ledgerOf(listing: Listing): { rows: LedgerRow[]; total: number } | null {
  const rows: LedgerRow[] = [];
  if (typeof listing.priceMinor === "number" && listing.priceMinor > 0) {
    rows.push({ label: "Rent", minor: listing.priceMinor });
  }
  const push = (label: string, minor: number | undefined) => {
    if (typeof minor === "number" && minor > 0) rows.push({ label, minor });
  };
  push("Caution deposit", listing.cautionDepositMinor);
  push("Service charge", listing.serviceChargeMinor);
  push("Agency", listing.agencyFeeMinor);
  push("Legal", listing.legalFeeMinor);

  /* One row is the rent alone, which is the opposite of the argument. */
  if (rows.length < 2) return null;

  const summed = rows.reduce((n, r) => n + r.minor, 0);
  const total =
    typeof listing.moveInCostMinor === "number" && listing.moveInCostMinor > 0
      ? listing.moveInCostMinor
      : summed;
  return { rows, total };
}

export async function MoveInTruth({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  /* The same pool the featured rail reads, so the two sections agree about
     what the catalogue is. The first listing able to show its arithmetic wins. */
  const listings = await getListingRepository().recommended(24);
  let ledger: { rows: LedgerRow[]; total: number } | null = null;
  let place: string | null = null;
  for (const l of listings) {
    const candidate = ledgerOf(l);
    if (candidate) {
      ledger = candidate;
      place = [l.title, l.area].filter(Boolean).join(", ");
      break;
    }
  }

  return (
    <section className="nf-shell py-section" aria-labelledby="nf-truth-title">
      <div className={ledger ? "grid gap-block lg:grid-cols-[1.05fr_0.95fr] lg:items-center" : ""}>
        <Reveal className="max-w-[52ch]">
          <span className="nf-overline">{t.landing.truth.overline}</span>
          <h2 id="nf-truth-title" className="nf-h1 mt-row">
            <Words text={t.landing.truth.title} accentFrom={5} />
          </h2>
          <p className="nf-lede mt-group">{t.landing.truth.body}</p>
        </Reveal>

        {ledger ? (
          <Reveal delay={80}>
            <figure className="nf-card p-card-lg">
              <figcaption className="flex items-center justify-between gap-inline">
                <span className="nf-overline">{t.landing.truth.ledgerTitle}</span>
                <UiIcon name="verified" size={16} className="shrink-0 text-[var(--nf-state-success)]" />
              </figcaption>
              {place ? (
                <p className="nf-caption mt-inline text-[var(--nf-content-muted)]">{place}</p>
              ) : null}
              <dl className="mt-group">
                {ledger.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-inline border-b border-[var(--nf-border-subtle)] py-row last:border-b-0"
                  >
                    <dt className="nf-caption text-[var(--nf-content-secondary)]">{row.label}</dt>
                    <dd className="nf-numeric text-[0.9375rem] text-[var(--nf-content-primary)]">
                      <Amount minorUnits={row.minor} locale={locale} />
                    </dd>
                  </div>
                ))}
                <div className="mt-row flex items-baseline justify-between gap-inline pt-row">
                  <dt className="font-semibold text-[var(--nf-content-primary)]">
                    {t.landing.card.moveIn}
                  </dt>
                  <dd className="nf-numeric nf-gradient-text text-[1.35rem] font-bold">
                    <Amount minorUnits={ledger.total} locale={locale} />
                  </dd>
                </div>
              </dl>
            </figure>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
