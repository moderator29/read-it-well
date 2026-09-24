import { formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import type { PaidRow } from "@/lib/after-gate/paid-prices";
import { bpsAsPercentText } from "@/lib/money/percent";
import { Section, TYPE } from "@/components/app/Screen";

/**
 * V-39. What people actually paid, beside what places are asking.
 *
 * Three states and none of them is a zero: a read that failed says so; a
 * cell below the crowd floor (five settled tenancies from three listers) says
 * exactly what the floor is, which is every area today; no chosen area says
 * to choose one; and a row, when there is one, prints the move-in range, a
 * band for how many tenancies stand behind it, the month range and the
 * median fee share. Month and year only: a day would be
 * precision the crowd rule was built to withhold.
 */
function monthYear(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "en" ? "en-NG" : locale, { month: "long", year: "numeric", timeZone: "Africa/Lagos" }).format(date);
}

export function PaidPanel({
  rows,
  locale,
  copy,
  typeNames,
}: {
  /** Undefined when no area is chosen: the figures are only ever per area. */
  rows: PaidRow[] | null | undefined;
  locale: Locale;
  copy: Dictionary["afterTheGate"]["paid"];
  typeNames: Record<string, string>;
}) {
  return (
    <Section title={copy.heading} description={copy.lede} divided>
      {rows === undefined ? (
        <p className={TYPE.body} data-testid="paid-needs-area">
          {copy.needsArea}
        </p>
      ) : rows === null ? (
        <p className={TYPE.body} data-testid="paid-unavailable">
          {copy.unavailable}
        </p>
      ) : rows.length === 0 ? (
        <p className={TYPE.body} data-testid="paid-empty">
          {copy.empty}
        </p>
      ) : (
        <ul className="grid gap-md" data-testid="paid-rows">
          {rows.map((row) => (
            <li key={`${row.propertyType}-${row.bedrooms}`}>
              <p className="nf-body nf-numeric font-semibold">
                {copy.row
                  .replace("{type}", typeNames[row.propertyType] ?? row.propertyType)
                  .replace(
                    "{beds}",
                    row.bedrooms === 1 ? copy.bedsOne : copy.bedsMany.replace("{count}", String(row.bedrooms)),
                  )
                  .replace("{low}", formatMoney(row.p25Minor, locale))
                  .replace("{high}", formatMoney(row.p75Minor, locale))
                  .replace("{band}", row.tenancyBand === "10+" ? copy.bandMany : copy.bandFew)}
              </p>
              {row.feeShareBps !== null && (
                <p className={`mt-2xs ${TYPE.rowMeta}`}>
                  {copy.feeShare.replace("{percent}", bpsAsPercentText(row.feeShareBps))}
                </p>
              )}
              {row.oldestAt && row.newestAt && (
                <p className={`mt-2xs ${TYPE.rowMeta}`}>
                  {copy.months.replace("{from}", monthYear(row.oldestAt, locale)).replace("{to}", monthYear(row.newestAt, locale))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
