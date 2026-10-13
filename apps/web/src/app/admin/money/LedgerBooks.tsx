import { countOf, formatMoney, getDictionary, type Locale } from "@vallo/i18n";
import type { LedgerRead } from "@/lib/admin/desk-reads/ledger-books";
import { fill } from "../_components/copy";
import { PanelEmpty, PanelUnavailable, Panel } from "../_components/panels";

/**
 * THE THREE LEDGER BOOKS, as a statement of confirmed entries.
 *
 * Read on the server from `ledger_balances_by_book` (a service-role view; see
 * `lib/admin/desk-reads/ledger-books.ts`). Each book is a record: where the
 * payment partner says customer money sits (never Vallo's), Vallo's own
 * revenue, and the marketing float set aside for referral payouts. Pending
 * entries are not counted, and the panel says so.
 */
export function LedgerBooks({ read, locale }: { read: LedgerRead; locale: Locale }) {
  const cov = getDictionary(locale).adminCoverage;
  const c = cov.ledger;
  const potNames = c.pot as Record<string, string | undefined>;
  const potNotes = c.potNote as Record<string, string | undefined>;
  return (
    <Panel title={c.title} id="ledger" className="nf-admin-anchor">
      <p className="nf-body-sm mb-row max-w-[68ch] text-content-2">{c.lede}</p>
      {read.state !== "ok" ? (
        <PanelUnavailable what={c.title} locale={locale} />
      ) : read.books.length === 0 ? (
        <PanelEmpty title={c.emptyTitle} body={c.emptyBody} />
      ) : (
        <div className="nf-admin-dt-wrap" tabIndex={0} role="region" aria-label={fill(cov.common.tableOf, { name: c.title })}>
          <table className="nf-admin-dt" data-testid="ledger-books">
            <thead>
              <tr>
                <th scope="col">{c.bookColumn}</th>
                <th scope="col" className="text-right">
                  {c.balanceColumn}
                </th>
                <th scope="col" className="text-right">
                  {c.entriesColumn}
                </th>
              </tr>
            </thead>
            <tbody>
              {read.books.flatMap((book) =>
                book.lines.map((line, index) => (
                  <tr key={`${book.pot}-${line.currency}`}>
                    <td>
                      <span className="block font-semibold text-content">{index === 0 ? (potNames[book.pot] ?? book.pot) : ""}</span>
                      {index === 0 && <span className="nf-caption block">{potNotes[book.pot]}</span>}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMoney(line.balanceMinor, locale, line.currency)}
                      {line.currency !== "NGN" && <span className="nf-caption ml-xs">{line.currency}</span>}
                    </td>
                    <td className="text-right tabular-nums">{countOf(line.entries, "entries")}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
