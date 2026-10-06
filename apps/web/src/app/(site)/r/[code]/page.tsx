import type { Metadata } from "next";
import { publicPlace } from "@/lib/after-gate/public-place";
import { formatMoney, getDictionary, intlTag } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { verifyReceiptCode } from "@/lib/receipts/verify";
import { formatReceiptCode, normaliseReceiptCode } from "@/lib/receipts/code";
import { ButtonLink } from "@/components/ui/Button";
import { IconPlate } from "@/components/ui/IconPlate";
import { DocFigure, DocHead, DocNote, DocPerforation, DocRow, DocRows, DocState, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";

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
 *
 * ONE CONFIDENT ANSWER (north star 10 J, Session 3). The answer is the page's
 * heading: "Genuine Vallo receipt", or "No receipt matches that code", set
 * large with its glyph on a round plate (so it is never colour alone), the
 * same answer card `/check` gives. A genuine receipt is then drawn as what it
 * is, a receipt: the Paper document sheet on the reader's theme (D28.1), the
 * amount as its one figure, the parties and the area as rows, the parts of
 * the payment as its ledger, and the area-only footnote at its foot. Nothing
 * on it is added: every line is one `verify_receipt` returned.
 */
export default async function ReceiptCheckPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const locale = await getLocale();
  const copy = getDictionary(locale).afterTheGate.receipt;
  const site = getDictionary(locale).experienceSite.receipt;
  const outcome = await verifyReceiptCode(decodeURIComponent(code));
  const normal = normaliseReceiptCode(decodeURIComponent(code));

  const frame = (answer: React.ReactNode, children?: React.ReactNode) => (
    <div className="nf-shell py-section">
      <div className="mx-auto max-w-md">
        <p className="nf-section-label">{copy.pageTitle}</p>
        {normal && <p className="nf-caption nf-numeric mt-2xs">{formatReceiptCode(normal)}</p>}
        <div className="mt-md">{answer}</div>
        {children ? <div className="mt-md">{children}</div> : null}
        {children ? null : <p className="nf-caption mt-md">{copy.footnote}</p>}
        <div className="mt-md">
          {/* Back to the lookup form. It said "Check", the form's own submit,
              on a page with nothing to check (C6, the route sweep). */}
          <ButtonLink href="/r" variant="secondary" full>
            {site.checkAnother}
          </ButtonLink>
        </div>
      </div>
    </div>
  );

  const verdict = (tone: "success" | "warning" | "neutral", icon: UiIconName, title: string, body: string | null, testId: string) => (
    <div className="nf-check-answer nf-receipt-verdict" data-tone={tone} data-testid={testId}>
      <h1 className="nf-check-answer__title">
        <IconPlate size="sm" shape="round" tone={tone}>
          <UiIcon name={icon} size={20} />
        </IconPlate>
        {title}
      </h1>
      {body ? <p className="nf-check-answer__body">{body}</p> : null}
    </div>
  );

  if (outcome.state === "not_found") {
    return frame(verdict("warning", "shield-stop", copy.notFoundTitle, copy.notFoundBody, "receipt-not-found"));
  }
  if (outcome.state === "rate_limited") {
    return frame(verdict("neutral", "calendar-clock", copy.limitedTitle, copy.limitedBody, "receipt-limited"));
  }
  if (outcome.state === "unavailable") {
    return frame(verdict("neutral", "alert-triangle", copy.unavailableTitle, copy.unavailableBody, "receipt-unavailable"));
  }

  const receipt = outcome.receipt;
  const month = new Intl.DateTimeFormat(intlTag[locale], {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date(receipt.paidAt));
  const period =
    receipt.rentPeriod === "month" ? copy.periodMonth : receipt.rentPeriod === "quarter" ? copy.periodQuarter : copy.periodYear;
  // Rule 10: through the closed lists, never the lister's spelling.
  const where = await publicPlace(receipt.area, receipt.city, receipt.stateCode);
  const parts = Object.entries(receipt.parts) as [keyof typeof copy.parts, number][];

  return frame(
    verdict("success", "verified-badge", copy.genuine, null, "receipt-genuine"),
    <DocumentSheet kind="receipt" printable aria-labelledby="receipt-paid">
      <DocHead label={<DocState done>{copy.genuine}</DocState>} />
      <DocFigure>{formatMoney(receipt.paidMinor, locale)}</DocFigure>
      <p id="receipt-paid" className="nf-doc__note">
        {copy.paidLine.replace("{amount}", formatMoney(receipt.paidMinor, locale)).replace("{month}", month)}
        {receipt.tenant
          ? ` ${copy.byLine.replace("{tenant}", receipt.tenant).replace("{lister}", receipt.lister ?? getDictionary(locale).afterTheGate.moneyMap.theLister)}`
          : ""}
        {where ? ` ${copy.forLine.replace("{period}", period).replace("{area}", where)}` : ""}
      </p>
      {parts.length > 0 ? (
        <>
          <DocPerforation />
          {/* Not `DocSection`, which draws an h3: this page's h1 is the verdict, so
              the ledger's heading is an h2 (no skipped level), in the sheet's
              own section classes. */}
          <section className="nf-doc__section" aria-labelledby="receipt-parts">
            <h2 id="receipt-parts" className="nf-doc__section-title">
              {copy.partsHeading}
            </h2>
            <DocRows>
              {parts.map(([key, minor]) => (
                <DocRow key={key} label={copy.parts[key]} numeric>
                  {formatMoney(minor, locale)}
                </DocRow>
              ))}
            </DocRows>
          </section>
        </>
      ) : null}
      <DocNote>{copy.footnote}</DocNote>
    </DocumentSheet>,
  );
}
