import { Amount } from "@/components/ui/Amount";
import { EmptyState, Section, TYPE } from "@/components/app/Screen";
import type { Locale } from "@vallo/i18n";
import type { AreaAskingRow, AreaCensus, AreaUtilityFacts } from "@/lib/price-check/types";

/**
 * THE AREA REPORT AND THE NEIGHBOURHOOD FACTS: what stage one actually is.
 *
 * ---------------------------------------------------------------------------
 * THE AREA REPORT MAKES A SMALLER CLAIM THAN A PER PROPERTY FIGURE AND SAYS SO.
 *
 * Three listings rather than five, because the sentence is weaker and true:
 * "three two-bed flats in Yaba are currently asking between X and Y" is a
 * statement about three listings, not an estimate of anything. Every row
 * carries its count and the months its listings were published in, and that
 * sentence beside every figure IS the product in stage one.
 *
 * ---------------------------------------------------------------------------
 * AND THE FACTS PANEL NEEDS NO PRICES AT ALL, WHICH IS WHY IT IS HERE.
 *
 * `power_grid`, `power_backup`, `water_supply`, `prepaid_meter` and
 * `has_estate_access` are collected structurally on every listing and nobody
 * else in this market captures them. On the day Price Check ships every per
 * property call refuses, and this panel is real value that does not depend on
 * the gate opening at all.
 *
 * EVERY FIGURE IN IT IS A COUNT, NEVER A PERCENTAGE. "7 of 19" is honest
 * about the sample it came from; "37 per cent" over nineteen listings is a
 * figure pretending to be a survey. The basis line says the same thing in
 * words: this is what the listings we hold say about themselves, not a survey
 * of the neighbourhood.
 */

export type AreaCopy = {
  heading: string;
  subheading: string;
  askingFor: string;
  studioFor: string;
  basis: string;
  perSqm: string;
  perSqmCoverage: string;
  noPerSqm: string;
  emptyTitle: string;
  emptyBody: string;
  demoOnlyTitle: string;
  demoOnlyBody: string;
  unreachableTitle: string;
  unreachableBody: string;
};

export type FactsCopy = {
  heading: string;
  basis: string;
  grid: string;
  backup: string;
  water: string;
  prepaid: string;
  estate: string;
  ofListings: string;
  mostCommon: string;
  empty: string;
} & Record<string, string>;

export type TypeNames = Record<string, string>;

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/** "March 2026". Month and year only: a day is precision we did not earn. */
function monthYear(iso: string, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-NG" : locale, {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function AreaReport({
  rows,
  census,
  locale,
  copy,
  typeNames,
}: {
  /** Null means we could not read, which is different from "there is nothing". */
  rows: AreaAskingRow[] | null;
  census: AreaCensus | null;
  locale: Locale;
  copy: AreaCopy;
  typeNames: TypeNames;
}) {
  /*
   * THREE EMPTY STATES AND THEY ARE NOT THE SAME SENTENCE.
   *
   * "We could not read the listings" is about us. "Everything here is an
   * example" is about our supply. "Nothing here yet" is about the
   * neighbourhood. Printing any of them in place of another would be a
   * statement about our own data that we had not checked, which is the
   * invented figure of rule 15 with the numbers left out.
   */
  if (rows === null) {
    return (
      <EmptyState
        icon="report-stats"
        title={copy.unreachableTitle}
        body={copy.unreachableBody}
        data-testid="nf-pc-area-unreachable"
      />
    );
  }

  if (rows.length === 0) {
    const examplesOnly = census !== null && census.realCount === 0 && census.demoCount > 0;
    return (
      <EmptyState
        icon={examplesOnly ? "seal-pending" : "report-stats"}
        title={examplesOnly ? copy.demoOnlyTitle : copy.emptyTitle}
        body={examplesOnly ? copy.demoOnlyBody : copy.emptyBody}
        data-testid={examplesOnly ? "nf-pc-area-demo-only" : "nf-pc-area-empty"}
      />
    );
  }

  return (
    <Section title={copy.heading} description={copy.subheading}>
      <div>
        {rows.map((row) => {
          const typeName = typeNames[row.propertyType] ?? row.propertyType;
          const what =
            row.bedrooms > 0
              ? fill(copy.askingFor, { bedrooms: row.bedrooms, type: typeName })
              : fill(copy.studioFor, { type: typeName });

          return (
            <div key={`${row.propertyType}-${row.bedrooms}`} className="nf-pc-area-row">
              <div className="nf-pc-area-row__what">
                <p className="nf-body font-semibold">{what}</p>
                <p className="nf-pc-area-row__basis nf-caption">
                  {fill(copy.basis, {
                    count: row.listingCount,
                    from: monthYear(row.oldestAt, locale),
                    to: monthYear(row.newestAt, locale),
                  })}
                </p>
                {/* THE COVERAGE IS PRINTED BESIDE EVERY PER SQUARE METRE
                    FIGURE, and where there is no figure the reason is printed
                    instead. Size is optional on a listing and the publish gate
                    asks for none, so a per square metre number exists only on a
                    self-selected subset and saying so is the difference between
                    a fact and an impression. */}
                {row.medianPerSqmMinor !== null && row.sizedCount >= 3 ? (
                  <p className="nf-pc-area-row__basis nf-caption">
                    <Amount
                      minorUnits={Math.round(row.medianPerSqmMinor)}
                      locale={locale}
                      compact
                    />{" "}
                    {fill(copy.perSqmCoverage, {
                      sized: row.sizedCount,
                      count: row.listingCount,
                    })}
                  </p>
                ) : (
                  <p className="nf-pc-area-row__basis nf-caption">{copy.noPerSqm}</p>
                )}
              </div>
              <p className="nf-pc-area-row__range nf-body-sm">
                <Amount minorUnits={row.p25Minor} locale={locale} glance />
                {" to "}
                <Amount minorUnits={row.p75Minor} locale={locale} glance />
              </p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/** The enum label a person reads, never the database's own spelling. */
function enumWord(value: string | null, prefix: string, copy: FactsCopy): string | null {
  if (value === null) return null;
  const key = `${prefix}${value
    .toLowerCase()
    .split("_")
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("")}`;
  return copy[key] ?? null;
}

export function NeighbourhoodFacts({
  facts,
  copy,
}: {
  facts: AreaUtilityFacts | null;
  copy: FactsCopy;
}) {
  if (facts === null || facts.listingCount === 0) {
    return (
      <Section title={copy.heading}>
        <p className="nf-body-sm text-[var(--nf-content-muted)]">{copy.empty}</p>
      </Section>
    );
  }

  const grid = enumWord(facts.powerGrid, "grid", copy);
  const backup = enumWord(facts.powerBackup, "backup", copy);
  const water = enumWord(facts.waterSupply, "water", copy);

  const cells: { label: string; value: string; count: string }[] = [];
  if (grid) {
    cells.push({
      label: copy.grid,
      value: grid,
      count: fill(copy.ofListings, {
        count: facts.powerGridCount ?? 0,
        total: facts.listingCount,
      }),
    });
  }
  if (backup) {
    cells.push({
      label: copy.backup,
      value: backup,
      count: fill(copy.ofListings, {
        count: facts.powerBackupCount ?? 0,
        total: facts.listingCount,
      }),
    });
  }
  if (water) {
    cells.push({
      label: copy.water,
      value: water,
      count: fill(copy.ofListings, {
        count: facts.waterSupplyCount ?? 0,
        total: facts.listingCount,
      }),
    });
  }
  /* A boolean gets its own DENOMINATOR, because "4 of 19" and "4 of 6 that
     said" are different facts and only the second one is true of a column
     nobody is required to fill in. */
  if (facts.prepaidMeterKnown > 0) {
    cells.push({
      label: copy.prepaid,
      value: fill(copy.ofListings, {
        count: facts.prepaidMeterCount,
        total: facts.prepaidMeterKnown,
      }),
      count: "",
    });
  }
  if (facts.estateAccessKnown > 0) {
    cells.push({
      label: copy.estate,
      value: fill(copy.ofListings, {
        count: facts.estateAccessCount,
        total: facts.estateAccessKnown,
      }),
      count: "",
    });
  }

  return (
    <Section title={copy.heading}>
      <p className={`mb-block ${TYPE.rowMeta}`}>
        {fill(copy.basis, { count: facts.listingCount })}
      </p>
      <div className="nf-pc-facts">
        {cells.map((cell) => (
          <div key={cell.label} className="nf-pc-fact">
            <span className="nf-pc-fact__label nf-caption">{cell.label}</span>
            <span className="nf-pc-fact__value nf-body-sm">{cell.value}</span>
            {cell.count && <span className="nf-pc-fact__count nf-caption">{cell.count}</span>}
          </div>
        ))}
      </div>
    </Section>
  );
}
