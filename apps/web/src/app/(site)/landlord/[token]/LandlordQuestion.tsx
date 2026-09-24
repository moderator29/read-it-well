import { formatDate, formatMoney, type Dictionary, type Locale } from "@vallo/i18n";
import { rentRows, type QuestionView } from "@/lib/landlord/reply";
import { ReplyActions } from "./ReplyActions";

/**
 * THE QUESTION CARD ON THE LANDLORD'S REPLY PAGE: what we are asking, about
 * which place, and the buttons. Separate from the page so the preview harness
 * can draw both questions with fixtures, which is the only way to see them
 * before the first real mandate carries a consent.
 *
 * For rent, the six parts frozen on `rent_payments`, only the ones that were
 * charged, then the total, labelled as the stated total or as the sum of the
 * parts, exactly as the tenant saw it. Every figure is `formatMoney` of the
 * kobo the database returned; nothing here does arithmetic on money.
 */

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

function day(iso: string | null, locale: Locale): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, locale, { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Lagos" });
}

export function LandlordQuestion({
  view,
  token,
  copy,
  locale,
}: {
  view: QuestionView;
  token: string;
  copy: Dictionary["landlord"]["reply"];
  locale: Locale;
}) {
  const rent = view.rent;
  const title =
    view.purpose === "vacancy" ? fill(copy.vacancyTitle, { place: view.place }) : fill(copy.rentTitle, { place: view.place });
  const lede =
    /* Rule 10: the lister's name is text they typed, so the page never has
       it and always uses the wording that names no agent. */
    view.purpose === "vacancy"
      ? copy.vacancyLedeNoAgent
      : rent
        ? fill(copy.rentLedeNoAgent, {
            total: formatMoney(rent.totalMinor, locale, rent.currency),
            moveIn: day(rent.moveIn, locale),
          })
        : "";

  return (
    <>
      <section className="nf-panel nf-panel--card block p-lg" data-testid="landlord-question">
        <p className="nf-overline text-[var(--nf-content-muted)]">{copy.chip}</p>
        <h1 className="nf-h2 mt-xs [text-wrap:balance]">{title}</h1>
        <p className="nf-body mt-sm leading-relaxed text-[var(--nf-content-secondary)]">{lede}</p>

        {rent && (
          <dl className="mt-md divide-y divide-[var(--nf-border-subtle)] border-y border-[var(--nf-border-subtle)]" data-testid="landlord-rent-rows">
            {rentRows(rent).map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-md py-xs">
                <dt className="text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">{copy.rows[row.key]}</dt>
                <dd className="text-[length:var(--nf-text-body-sm)] font-semibold tabular-nums">
                  {formatMoney(row.minor, locale, rent.currency)}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-md py-xs">
              <dt className="text-[length:var(--nf-text-body-sm)] font-semibold">
                {rent.totalStated ? copy.rows.total : copy.rows.totalSum}
              </dt>
              <dd className="text-[length:var(--nf-text-body)] font-extrabold tabular-nums">
                {formatMoney(rent.totalMinor, locale, rent.currency)}
              </dd>
            </div>
          </dl>
        )}

        <ReplyActions token={token} purpose={view.purpose} copy={copy} />
      </section>
      <p className="nf-caption mt-md text-center text-[var(--nf-content-muted)]">{copy.privacy}</p>
    </>
  );
}
