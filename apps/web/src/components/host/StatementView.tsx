import Link from "next/link";
import { countOf, formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import { addMonths } from "@/lib/host/rate-calendar";
import { statementTotals, type StatementLine } from "@/lib/host/statement";
import { EARNINGS_SETTLEMENT, HISTORY_NOT_A_BALANCE } from "@/lib/money/copy";
import { COMPANY_FORMAL_NAME, COMPANY_REGISTERED_OFFICE } from "@/lib/legal/company";
import { EmptyState } from "@/components/app/Screen";
import { PageHeader } from "@/components/app/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import {
  DocFigure,
  DocHead,
  DocNote,
  DocRow,
  DocRows,
  DocSection,
  DocumentSheet,
} from "@/components/app/money/DocumentSheet";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { PrintButton } from "@/components/host/PrintButton";
import "@/app/host/host-desk.css";

/**
 * ONE MONTH'S PAYOUT STATEMENT, DRAWN (C9). Read only: the page reads the
 * lines, this draws them, and the preview harness draws it from fixtures.
 */
export function StatementView({
  month,
  thisMonth,
  title,
  lines,
  complete,
  failed,
  locale,
}: {
  month: string;
  thisMonth: string;
  title: string;
  lines: StatementLine[];
  complete: boolean;
  failed: boolean;
  locale: Locale;
}) {
  const tag = locale === "en" ? "en-NG" : locale;
  const totals = statementTotals(lines);
  const w = getDictionary(locale).experienceFeatures.workspace.statement;
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <div className="nf-stmt">
      <PageHeader
        variant="large"
        back={false}
        title={`Statement, ${title}`}
        subtitle={`Issued by ${COMPANY_FORMAL_NAME}`}
      />

      <div className="mt-md grid gap-md">
        <nav className="nf-rcal__monthbar nf-stmt-noprint" aria-label="Other months">
          <Link href={`/host/earnings/statement?month=${prev}`} className="nf-btn nf-btn--surface nf-btn--icon nf-btn--round" aria-label="Previous month">
            <UiIcon name="arrow-left" size={20} />
          </Link>
          <p className="nf-rcal__month">{title}</p>
          {next <= thisMonth ? (
            <Link href={`/host/earnings/statement?month=${next}`} className="nf-btn nf-btn--surface nf-btn--icon nf-btn--round" aria-label="Next month">
              <UiIcon name="arrow-right" size={20} />
            </Link>
          ) : (
            <span className="nf-rcal__monthbar-gap" aria-hidden="true" />
          )}
        </nav>

        {failed ? (
          <p className="nf-body" role="alert">
            Your statement could not be read just now. Nothing has changed. Refresh to try again.
          </p>
        ) : lines.length === 0 ? (
          <EmptyState
            icon="ledger-book"
            title="No payments this month"
            body="When a guest pays, the payment appears here line by line: what they paid, what Vallo kept, and your share."
            action={
              <ButtonLink href="/host/earnings" variant="secondary" size="lg">
                Back to earnings
              </ButtonLink>
            }
          />
        ) : (
          <>
            {!complete ? (
              <p className="nf-body" role="alert">
                This month has more lines than we could read at once, so the totals below are not the whole month. Download
                is paused until it can be read in full.
              </p>
            ) : null}

            {/*
              THE STATEMENT IS A DOCUMENT (D28.1, reference 7056): a light
              sheet of paper on whatever theme the host chose, because this
              is the page a host prints and hands to a bank. The month bar
              and the two actions above stay in the host's theme; only the
              statement itself is paper, and only it prints (print.css).

              The actions sit under the sheet, in the host's theme, the way
              every document's do (DocActions, reference 7074).

              The share is stated, not counted: a document says money that
              has already moved, and a figure rolling up on it would imply
              movement (the rule B2 set for every sheet).
            */}
            <DocumentSheet printable aria-labelledby="nf-stmt-title" data-testid="host-statement-sheet">
              <DocHead label={w.label} title={title} id="nf-stmt-title" />
              <DocFigure testId="host-statement-share">{formatMoney(totals.shareMinor, locale)}</DocFigure>
              <DocRows>
                <DocRow label={w.guestsPaid} numeric>
                  {formatMoney(totals.grossMinor, locale)}
                </DocRow>
                <DocRow label={w.commission} numeric>
                  {formatMoney(totals.commissionMinor, locale)}
                </DocRow>
                <DocRow label={w.guarantee} numeric>
                  {formatMoney(totals.guaranteeMinor, locale)}
                </DocRow>
                <DocRow label={w.share} variant="total" numeric>
                  {formatMoney(totals.shareMinor, locale)}
                </DocRow>
              </DocRows>
              <DocNote>
                {`${countOf(totals.payments, "payments", locale)}${totals.reversals ? `, ${totals.reversals} reversed by refunds` : ""}. ${EARNINGS_SETTLEMENT}`}
              </DocNote>

              <DocSection title={w.lines} id="nf-stmt-lines">
                <div className="nf-stmt-wide">
                  <table className="nf-stmt-table">
                    <thead>
                      <tr>
                        <th scope="col">Date and stay</th>
                        <th scope="col">Guest paid</th>
                        <th scope="col">Commission</th>
                        <th scope="col">Guarantee</th>
                        <th scope="col">Your share</th>
                        <th scope="col">Paystack reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr key={line.id}>
                          <td>
                            <span className="block">{day(line.day, tag)}</span>
                            <span className="nf-caption">
                              {line.kind === "reversal" ? "Refund reversal, " : ""}
                              {line.title}
                            </span>
                          </td>
                          <td>{formatMoney(line.grossMinor, locale)}</td>
                          <td>{formatMoney(line.commissionMinor, locale)}</td>
                          <td>{formatMoney(line.guaranteeMinor, locale)}</td>
                          <td>
                            <strong>{formatMoney(line.shareMinor, locale)}</strong>
                          </td>
                          <td className="nf-caption">{line.reference ?? "None"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total</td>
                        <td>{formatMoney(totals.grossMinor, locale)}</td>
                        <td>{formatMoney(totals.commissionMinor, locale)}</td>
                        <td>{formatMoney(totals.guaranteeMinor, locale)}</td>
                        <td>{formatMoney(totals.shareMinor, locale)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <ul className="nf-stmt-lines nf-stmt-narrow">
                  {lines.map((line) => (
                    <LineCard key={line.id} line={line} locale={locale} tag={tag} />
                  ))}
                </ul>
              </DocSection>

              <DocNote>
                {HISTORY_NOT_A_BALANCE} {COMPANY_FORMAL_NAME}, {COMPANY_REGISTERED_OFFICE}.
              </DocNote>
            </DocumentSheet>

            <div className="nf-stmt-noprint nf-stmt-actions">
              {complete ? (
                /* A plain anchor: the CSV is a file from a route handler, not a
                   page, so client navigation must not try to render it. */
                <a href={`/host/earnings/statement/csv?month=${month}`} download className="nf-btn nf-btn--primary nf-btn--md">
                  <UiIcon name="file-check" size={20} />
                  Download CSV
                </a>
              ) : null}
              <PrintButton />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function day(iso: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

function LineCard({ line, locale, tag }: { line: StatementLine; locale: Locale; tag: string }) {
  return (
    <li className="nf-stmt-line" data-kind={line.kind}>
      <div className="flex items-start justify-between gap-sm">
        <div className="min-w-0">
          <p className="nf-decide__title">{line.title}</p>
          <p className="nf-decide__sub">
            {day(line.day, tag)}
            {line.kind === "reversal" ? " · Refund reversal" : ""}
          </p>
        </div>
        <p className="nf-decide__title nf-numeric">{formatMoney(line.shareMinor, locale)}</p>
      </div>
      <dl className="nf-stmt-line__split">
        <dt>Guest paid</dt>
        <dd>{formatMoney(line.grossMinor, locale)}</dd>
        <dt>Vallo commission</dt>
        <dd>{formatMoney(line.commissionMinor, locale)}</dd>
        <dt>Guarantee contribution</dt>
        <dd>{formatMoney(line.guaranteeMinor, locale)}</dd>
        <dt className="is-share">Your share</dt>
        <dd className="is-share">{formatMoney(line.shareMinor, locale)}</dd>
        <dt>Paystack reference</dt>
        <dd>{line.reference ?? "None"}</dd>
      </dl>
    </li>
  );
}
