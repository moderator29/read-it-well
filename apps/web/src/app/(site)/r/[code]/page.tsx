import type { Metadata } from "next";
import { publicPlace } from "@/lib/after-gate/public-place";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { verifyReceiptCode } from "@/lib/receipts/verify";
import { formatReceiptCode, normaliseReceiptCode } from "@/lib/receipts/code";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { UiIcon } from "@/design-system/icons/UiIcon";

/** Never indexed: a receipt is shown to whoever holds the code, not to a crawler. */
export const metadata: Metadata = { title: "Receipt check", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

/**
 * V-55. A RECEIPT ANYONE CAN VERIFY, WITHOUT AN ADDRESS.
 *
 * A DOOR, and the only public page that answers from a rent payment. It is
 * open signed out because the people who need it (an employer, an embassy, a
 * tribunal clerk, a new landlord) are not members. What it shows is decided
 * by `public.verify_receipt` and nothing else: the amount, the month, the
 * tenant's first name and last initial, the lister's first name and initial, the period
 * and the area. Never the address, a landmark, a phone number or an email.
 * The same page is served to every visitor; there is no unfurler variant.
 *
 * Four answers, each in words: genuine, no such code (which is also what a
 * stopped code answers), too many checks, or could not check.
 */
export default async function ReceiptCheckPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).afterTheGate.receipt;
  const outcome = await verifyReceiptCode(decodeURIComponent(code));
  const normal = normaliseReceiptCode(decodeURIComponent(code));

  const frame = (children: React.ReactNode) => (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-md">
        <h1 className="nf-h2">{copy.pageTitle}</h1>
        {normal && <p className="nf-caption nf-numeric mt-2xs">{formatReceiptCode(normal)}</p>}
        <div className="mt-md">{children}</div>
        <p className="nf-caption mt-md">{copy.footnote}</p>
        <div className="mt-md">
          <ButtonLink href="/r" variant="secondary" full>
            {copy.formSubmit}
          </ButtonLink>
        </div>
      </div>
    </div>
  );

  if (outcome.state === "not_found") {
    return frame(<EmptyState icon="seal-cross" title={copy.notFoundTitle} body={copy.notFoundBody} data-testid="receipt-not-found" />);
  }
  if (outcome.state === "rate_limited") {
    return frame(<EmptyState icon="calendar-clock" title={copy.limitedTitle} body={copy.limitedBody} data-testid="receipt-limited" />);
  }
  if (outcome.state === "unavailable") {
    return frame(<EmptyState icon="alert-triangle" title={copy.unavailableTitle} body={copy.unavailableBody} data-testid="receipt-unavailable" />);
  }

  const receipt = outcome.receipt;
  const month = new Intl.DateTimeFormat(locale === "en" ? "en-NG" : locale, {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(receipt.paidAt));
  const period =
    receipt.rentPeriod === "month" ? copy.periodMonth : receipt.rentPeriod === "quarter" ? copy.periodQuarter : copy.periodYear;
  // Rule 10: through the closed lists, never the lister's spelling.
  const where = await publicPlace(receipt.area, receipt.city, receipt.stateCode);

  return frame(
    <section className="nf-panel nf-panel--card block p-md" data-testid="receipt-genuine">
      <p className="flex items-center gap-xs font-semibold text-[var(--nf-state-success)]">
        <UiIcon name="verified" size={18} />
        <span>{copy.genuine}</span>
      </p>
      <p className="nf-h3 nf-numeric mt-sm">
        {copy.paidLine.replace("{amount}", formatMoney(receipt.paidMinor, locale)).replace("{month}", month)}
      </p>
      {receipt.tenant && receipt.lister && (
        <p className="nf-body mt-xs">
          {copy.byLine.replace("{tenant}", receipt.tenant).replace("{lister}", receipt.lister)}
        </p>
      )}
      {where && <p className="nf-body mt-2xs">{copy.forLine.replace("{period}", period).replace("{area}", where)}</p>}
      {Object.keys(receipt.parts).length > 0 && (
        <>
          <h2 className="nf-h4 mt-md">{copy.partsHeading}</h2>
          <dl className="mt-xs grid gap-2xs">
            {(Object.entries(receipt.parts) as [keyof typeof copy.parts, number][]).map(([key, minor]) => (
              <div key={key} className="flex items-baseline justify-between gap-md">
                <dt className="nf-body-sm text-[var(--nf-content-secondary)]">{copy.parts[key]}</dt>
                <dd className="nf-body-sm nf-numeric font-semibold">{formatMoney(minor, locale)}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>,
  );
}
