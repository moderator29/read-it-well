import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@vallo/i18n/core";
import { Amount, Figure } from "@/components/ui/Amount";
import { StatusPill } from "@/components/ui/StatusPill";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { formatMoneyDate } from "@/lib/money/dates";
import { readAdminMoneyHistory } from "@/lib/money/history";
import { KIND_LABEL, statusFor } from "@/lib/money/history-model";
import { ADMIN_HISTORY_NOTE, ADMIN_HISTORY_UNAVAILABLE } from "@/lib/money/copy";
import { CalmNote, Panel } from "./panels";

/**
 * THE PLATFORM-WIDE HISTORY ON THE MONEY DESK (`id="history"`).
 *
 * The totals first, then the latest fifty payments and refunds, then the way
 * out to a spreadsheet. Every figure is read from `admin_money_summary` and
 * `admin_money_history` with the desk's OWN session client, the one
 * `requireAdmin("finance")` hands back as `userClient`: the functions decide
 * by `auth.uid()` and refuse everybody without the finance scope, so the
 * service client is never the reader here.
 *
 * Unsigned amounts. On a member's screen a payment is "-" because it left
 * THEM; on the desk it left nobody in particular, so each row names its kind
 * and its state and the figure stands alone. Refund states are the processor's
 * words through `statusFor`, so a submitted refund is never read as settled.
 *
 * The CSV link is a plain anchor, not a `Link`: it is a file, and a prefetch
 * of it would write an audit row nobody asked for.
 */
const PANEL_ROWS = 50;

export async function MoneyHistoryPanel({
  userClient,
  locale,
}: {
  userClient: SupabaseClient<Database>;
  locale: Locale;
}) {
  const read = await readAdminMoneyHistory(userClient, { limit: PANEL_ROWS });

  return (
    <Panel
      id="history"
      title="Payments and refunds"
      action={
        <a href="/admin/money/export" download className="nf-admin-panel__link" data-testid="money-history-csv">
          Download CSV
        </a>
      }
    >
      <p className="mb-sm text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">{ADMIN_HISTORY_NOTE}</p>
      {read.state !== "ok" ? (
        <CalmNote kind="error" title="Not available" fills={ADMIN_HISTORY_UNAVAILABLE} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-sm sm:grid-cols-3" data-testid="money-history-summary">
            {[
              { label: "Paid by renters and guests", minor: read.summary.grossMinor },
              { label: "Settled to listers", minor: read.summary.listerMinor },
              { label: "To the Guarantee reserve", minor: read.summary.guaranteeMinor },
              { label: "Vallo commission", minor: read.summary.commissionMinor },
              { label: "Refunded (processed)", minor: read.summary.refundedMinor },
            ].map((fact) => (
              <div key={fact.label}>
                <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">{fact.label}</dt>
                <dd className="mt-3xs font-semibold text-[var(--nf-content-primary)]">
                  <Amount minorUnits={fact.minor} locale={locale} showFraction />
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-[length:var(--nf-text-caption)] text-[var(--nf-content-muted)]">Payments</dt>
              <dd className="mt-3xs font-semibold text-[var(--nf-content-primary)]">
                <Figure value={read.summary.payments} locale={locale} />
              </dd>
            </div>
          </dl>

          {read.entries.length === 0 ? (
            <p className="mt-md text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
              No payment or refund has been recorded on the platform yet.
            </p>
          ) : (
            <div className="mt-md overflow-x-auto">
              <Table caption={`The latest ${PANEL_ROWS} payments and refunds`} density="dense">
                <THead>
                  <TR>
                    <TH>When</TH>
                    <TH>Kind</TH>
                    <TH>Listing</TH>
                    <TH>Payer</TH>
                    <TH>Payee</TH>
                    <TH align="end">Amount</TH>
                    <TH>State</TH>
                  </TR>
                </THead>
                <TBody>
                  {read.entries.map((entry) => {
                    const status = statusFor(entry.kind, entry.status);
                    return (
                      <TR key={entry.id}>
                        <TD>{formatMoneyDate(entry.occurredAt, locale, { withTime: true })}</TD>
                        <TD>{KIND_LABEL[entry.kind]}</TD>
                        <TD>{entry.title ?? "A property"}</TD>
                        <TD>{entry.payerName ?? "Not recorded"}</TD>
                        <TD>{entry.payeeName ?? (entry.kind === "refund" ? "Back to the payer" : "Not recorded")}</TD>
                        <TD align="end">
                          <Amount minorUnits={entry.amountMinor} locale={locale} showFraction />
                        </TD>
                        <TD>
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
