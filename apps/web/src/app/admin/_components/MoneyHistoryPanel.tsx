import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Locale } from "@vallo/i18n/core";
import { Amount, Figure } from "@/components/ui/Amount";
import type { StatusTone } from "@/components/ui/StatusPill";
import { getDictionary } from "@vallo/i18n";
import { DocHead, DocRow, DocRows, DocumentSheet } from "@/components/app/money/DocumentSheet";
import { PaperLedger, PaperLedgerRow, PaperStatus, type PaperState } from "./paper";
import { formatMoneyDate } from "@/lib/money/dates";
import { readAdminMoneyHistory } from "@/lib/money/history";
import { KIND_LABEL, statusFor } from "@/lib/money/history-model";
import { ADMIN_HISTORY_NOTE, ADMIN_HISTORY_UNAVAILABLE } from "@/lib/money/copy";
import { CalmNote } from "./panels";

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
 * of it would write an audit row nobody asked for. It sits under the sheet, on
 * the panel, not on the paper.
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

  const t = getDictionary(locale);
  const x = t.experienceAdmin.money;

  return (
    <section id="history" className="nf-admin-doc nf-admin-anchor">
      <DocumentSheet aria-labelledby="history-title" data-testid="money-history">
        <DocHead label={x.historyOverline} title={x.historyTitle} id="history-title" />
        <p className="nf-doc__note">{ADMIN_HISTORY_NOTE}</p>
        {read.state !== "ok" ? (
          <div className="mt-sm">
            <CalmNote kind="error" title="Not available" fills={ADMIN_HISTORY_UNAVAILABLE} />
          </div>
        ) : (
          <>
            <DocRows testId="money-history-summary">
              {[
                { label: "Paid by renters and guests", minor: read.summary.grossMinor },
                { label: "Settled to listers", minor: read.summary.listerMinor },
                { label: "To the Guarantee reserve", minor: read.summary.guaranteeMinor },
                { label: "Vallo commission", minor: read.summary.commissionMinor },
                { label: "Refunded (processed)", minor: read.summary.refundedMinor },
              ].map((fact) => (
                <DocRow key={fact.label} label={fact.label} numeric>
                  <Amount minorUnits={fact.minor} locale={locale} showFraction />
                </DocRow>
              ))}
              <DocRow label="Payments" numeric>
                <Figure value={read.summary.payments} locale={locale} />
              </DocRow>
            </DocRows>

            {read.entries.length === 0 ? (
              <p className="nf-doc__note">No payment or refund has been recorded on the platform yet.</p>
            ) : (
              <PaperLedger label={`The latest ${PANEL_ROWS} payments and refunds`}>
                {read.entries.map((entry) => {
                  const status = statusFor(entry.kind, entry.status);
                  return (
                    <PaperLedgerRow
                      key={entry.id}
                      when={formatMoneyDate(entry.occurredAt, locale, { withTime: true })}
                      title={`${KIND_LABEL[entry.kind]} · ${entry.title ?? "A property"}`}
                      sub={`${entry.payerName ?? "Not recorded"} to ${entry.payeeName ?? (entry.kind === "refund" ? "back to the payer" : "not recorded")}`}
                      amount={<Amount minorUnits={entry.amountMinor} locale={locale} showFraction />}
                      status={<PaperStatus state={paperStateFor(status.tone)}>{status.label}</PaperStatus>}
                    />
                  );
                })}
              </PaperLedger>
            )}
          </>
        )}
      </DocumentSheet>
      {/* The way out to a spreadsheet is a control, so it sits on the panel
          beside the sheet and never on the paper (D28.1); a statement that is
          printed or screenshotted carries no link. */}
      <p className="nf-admin-doc__action">
        <a href="/admin/money/export" download className="underline" data-testid="money-history-csv">
          Download CSV
        </a>
      </p>
    </section>
  );
}

/** The ledger's states on paper: a word and a shape, from the tone the money model already chose. */
function paperStateFor(tone: StatusTone): PaperState {
  return tone === "success" ? "done" : tone === "danger" ? "failed" : tone === "neutral" ? "neutral" : "waiting";
}
