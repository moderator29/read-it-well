import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import Link from "next/link";
import {
  getEscrowConsole,
  getMoneyConsole,
  getRefundConsole,
  type RefundState,
  type RefundView,
  type WalletEntryView,
} from "@/lib/admin/money-queries";
import type { StatusTone } from "@/components/ui/StatusPill";
import { CANCELLATION_REASONS } from "@/lib/trust/cancellation";
import { adminUi } from "../_components/ui";
import { EscrowRuling } from "../_components/MoneyDecisions";
import { QueueFilters, readQueueQuery } from "../_components/QueueFilters";

/**
 * Where a refund's money is, in words and in a tone that survives greyscale.
 * The word is the signal; the tone only agrees with it.
 */
const REFUND_STATE: Record<RefundState, { label: string; tone: StatusTone }> = {
  credited: { label: "In the guest's wallet", tone: "success" },
  not_settled: { label: "Credit not settled yet", tone: "info" },
  failed: { label: "Credit failed", tone: "danger" },
  not_credited: { label: "Recorded, no credit found", tone: "danger" },
  nothing_owed: { label: "Nothing was owed", tone: "neutral" },
};

export const metadata: Metadata = {
  title: "Money",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * The money console. Wallets, the ledger, and anything stuck.
 *
 * The console had fourteen sections and not one of them was about money. An
 * operator asked "where is my five thousand naira" had nothing to open: no
 * wallet view, no ledger, no way to find a withdrawal that had been sitting
 * PENDING since Tuesday. The only answer available to support was to ask an
 * engineer to run SQL against production, which is both slow and the worst
 * possible habit to build.
 *
 * STUCK COMES FIRST, above the totals and above the ledger, because it is the
 * only thing on this page where somebody is currently waiting. A PENDING debit
 * is money that has left a person's spendable balance and has not arrived
 * anywhere; every minute it sits there is a minute somebody is short.
 */
export default async function AdminMoneyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const common = t.admin.common;
  const ui = adminUi(t, locale);

  /*
   * ONE SUBJECT, ONE CONTROL, EVERY PANEL APPLIES IT.
   *
   * `MoneyFilter` in `lib/admin/money-queries.ts` carries the argument for the
   * contract; this is the half of it the reader can see. Three panels and a row
   * of tiles, all narrowed by the same term, because "where is this person's
   * money" is one question and the console answers it in four places.
   *
   * `status` and `offset` are dropped rather than read. The shared queue frame
   * carries both, and neither means anything here: status is a different enum
   * per panel, and three panels have three orderings and cannot share one
   * cursor. A hand-edited `?status=PENDING` on this URL therefore does nothing,
   * and the important half of that is that it does not LOOK as though it did -
   * no chip lights up, and `narrowed` below stays false, so nothing on the
   * screen claims a narrowing that was not applied.
   */
  const params = await searchParams;
  const asked = readQueueQuery(params);
  const query = {
    ...(asked.q ? { q: asked.q } : {}),
    ...(asked.from ? { from: asked.from } : {}),
    ...(asked.to ? { to: asked.to } : {}),
  };
  const narrowed = Boolean(query.q || query.from || query.to);

  const [read, refunds, escrow] = await Promise.all([
    getMoneyConsole(query),
    getRefundConsole(query),
    /* Disputes only. The escrow desk has its own page; this is the one
       decision from it that is a refund question, made reachable here. */
    getEscrowConsole({ status: "DISPUTED" }),
  ]);

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader title="Money" lede="Wallets, the ledger, and anything stuck." />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { wallets, recent, stuck, totals } = read.data;
  const shown = wallets.length + recent.length + stuck.length;

  function EntryRow({ entry }: { entry: WalletEntryView }) {
    const outgoing = entry.direction === "debit";
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm">
        <span className="min-w-0">
          <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
            {/* Same column-keyed lookup as the status chip beside it, rather
                than a second hand-rolled `replace(/_/g, " ")` that would print
                "escrow hold" in lower case beside a properly named status. */}
            {entry.note ?? ui.columnLabel("walletEntryKind", entry.kind)}
            {entry.ownerName ? ` · ${entry.ownerName}` : ""}
          </span>
          {/* THE REFERENCE IS NEVER CLIPPED. It is the only string an operator
              can trace a payment by with Paystack or Yellow Card, and it was
              rendered at 11px monospace with an ellipsis, so the money screen
              could not do the one thing it exists for. `user-select: all` means
              one tap takes the whole string. */}
          <span className="block font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
            {entry.reference}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-sm">
          {/*
            NOT `label={entry.status}`. That printed `PENDING`, `COMPLETED`,
            `FAILED` and `REVERSED` in shouting capitals on the money screen,
            which is the column, not a word for a person.

            And not the bare `status={entry.status}` either, which would have
            fallen through to `statusLabel` and `t.admin.common.status`, where
            `PENDING` reads "Requested". That is right for a booking and wrong
            for a wallet entry, where PENDING means the money has not settled.
            `columnLabel` is keyed by column as well as by value for exactly
            this collision. `status` is still passed, because the TONE is
            shared across every queue and only the word is per-column.
          */}
          <ui.StatusChip
            label={ui.columnLabel("walletEntryStatus", entry.status)}
            status={entry.status}
          />
          <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
            {outgoing ? "-" : "+"}
            {formatMoney(entry.amountMinor, locale)}
          </span>
          <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {ui.when(entry.createdAt)}
          </span>
        </span>
      </li>
    );
  }

  function RefundRow({ refund }: { refund: RefundView }) {
    const state = REFUND_STATE[refund.state];
    return (
      <li className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm">
        <span className="min-w-0">
          <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
            {refund.guestName ?? "No display name"}
            {" · "}
            {refund.listingTitle ?? "A listing that is no longer there"}
            {" · "}
            {CANCELLATION_REASONS.find((r) => r.code === refund.reason)?.label ??
              ui.columnLabel("cancellationReason", refund.reason)}
          </span>
          {/* THE REFERENCE IS NEVER CLIPPED. It is the string the guest quotes
              and the wallet entry carries. Without one, the stay's id is what
              an operator opens. */}
          <span className="block font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
            {refund.reference ?? refund.bookingId}
          </span>
          <Link
            href={`/admin/bookings/${refund.bookingId}`}
            className="mt-2xs inline-block text-[var(--nf-text-caption)] underline"
          >
            Open the stay
          </Link>
        </span>
        <span className="flex shrink-0 flex-wrap items-baseline gap-sm">
          <ui.StatusChip label={state.label} tone={state.tone} />
          <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
            {formatMoney(refund.refundMinor, locale)}
          </span>
          {refund.retainedMinor > 0 && (
            <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
              {formatMoney(refund.retainedMinor, locale)} kept
            </span>
          )}
          <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
            {ui.when(refund.createdAt)}
          </span>
        </span>
      </li>
    );
  }

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Money"
        lede="Every wallet, the ledger behind them, and anything that has stopped moving. Amounts are what the ledger says, summed from COMPLETED entries only."
        count={stuck.length}
      />

      {/* Stuck first. It is the only thing here somebody is waiting on. */}
      {stuck.length > 0 && (
        <section className="nf-card mb-md p-md sm:p-lg">
          <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
            Stuck, and somebody is waiting
          </h2>
          <p className="mt-2xs max-w-[62ch] text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            These debits have been PENDING for over half an hour. The money has
            left a spendable balance and has not arrived anywhere. The stale
            hold sweeper releases withdrawal holds on a schedule; anything here
            that is not a withdrawal has not got a sweeper and needs a person.
          </p>
          <ul className="mt-sm">
            {stuck.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}

      {/*
        ABOVE THE TILES, WHICH IS THE OPPOSITE OF `/admin/escrow`, ON PURPOSE.

        There the tiles answer "how much is the platform holding", which is true
        of everything and does not move when an operator narrows, so the control
        sits under them with the rows it changes. Here the tiles are summed from
        the wallets the filter selected, so the filter belongs above them: a
        control that changes a number must be readable before that number is.
      */}
      <QueueFilters
        base="/admin/money"
        query={query}
        common={common}
        searchLabel="Find a person, a wallet or a payment"
        searchPlaceholder="Name, wallet id, or payment reference"
      />

      <ui.StatRow>
        {/*
          "Settled across all wallets" was the old label and it was never true.
          This read has always been capped, and is now filtered as well, so the
          tile is named for what it actually sums. A headline figure on a money
          screen that overstates its own scope is the one number on the console
          an operator would repeat to a customer.
        */}
        <ui.Stat
          label="Settled"
          value={formatMoney(totals.balanceMinor, locale)}
          hint={
            narrowed
              ? "Across the wallets matching this filter"
              : "Across the wallets listed below, newest first"
          }
        />
        <ui.Stat
          label="Held pending"
          value={formatMoney(totals.heldMinor, locale)}
          hint="Debits that have left a spendable balance and not settled"
          tone={totals.heldMinor === 0 ? "neutral" : "warning"}
        />
        <ui.Stat
          label="Wallets"
          value={String(totals.walletCount)}
          hint={narrowed ? "Matching this filter" : "Newest first, up to forty"}
        />
      </ui.StatRow>

      {narrowed && shown === 0 && (
        /* A SEARCH THAT MATCHED NOTHING IS NOT A CLEARANCE. This drew the
           emerald tick, so "all clear" was shown over a queue that may hold
           hundreds of rows, none of them matching. The third state says what
           this actually is: the result of the operator's own filter. */
        <ui.QueueEmpty
          title={common.noMatchTitle}
          body={common.noMatchBody}
          state="no-match"
        />
      )}

      <section className="nf-card mb-md p-md sm:p-lg">
        <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">Wallets</h2>
        {/* The panel's own empty line is a statement about the WHOLE platform,
            and under a filter it stops being true: "Nobody has a wallet yet" is
            a lie to somebody who searched a name that has none. Narrowed, the
            panel says nothing and the one no-match card above answers for the
            screen. Same arrangement as `/admin/escrow`. */}
        {wallets.length === 0 ? (
          narrowed ? null : (
          <p className="mt-xs text-[var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
            Nobody has a wallet yet. One is created the first time somebody is
            paid or funds an account.
          </p>
          )
        ) : (
          <ul className="mt-xs">
            {wallets.map((wallet) => (
              <li
                key={wallet.id}
                className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs border-t border-[var(--nf-border-subtle)] py-sm"
              >
                <span className="min-w-0">
                  <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
                    {wallet.ownerName ?? "No display name"}
                  </span>
                  {/* THE OWNER'S ID, AND IT IS NOT A REFERENCE. The comment
                      that used to sit here was a copy of the ledger row's, and
                      it said this string was what an operator traces a payment
                      by with Paystack. It is not; it is the profile id, and the
                      reason it is printed unclipped is that it is what an
                      operator pastes into the search box above, or into a
                      colleague's message, to get from a name to every other
                      screen this person appears on. `user-select: all` means one
                      tap takes the whole of it. */}
                  <span className="block font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
                    {wallet.userId}
                  </span>
                </span>
                <span className="flex shrink-0 items-baseline gap-md">
                  {wallet.heldMinor > 0 && (
                    <span className="text-[var(--nf-text-overline)] text-[var(--nf-content-muted)]">
                      {formatMoney(wallet.heldMinor, locale)} held
                    </span>
                  )}
                  <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
                    {formatMoney(wallet.balanceMinor, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/*
        THE REFUND CONSOLE.

        Two kinds of money go back to a person on this platform and both are
        decided elsewhere: a stay's refund on the stay's own page, where the
        published schedule works out the figure and the operator chooses only
        why, and a disputed escrow on the escrow desk, where an operator rules
        release or refund with a reason both sides read. This section is where
        an operator answers "did the guest get it": every refund decided, with
        the wallet entry's own status beside it, and the two decisions reachable
        from here with their consequence in front of them. Nothing on this
        section types an amount.
      */}
      <section className="nf-card mb-md p-md sm:p-lg">
        <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
          Refunds
        </h2>
        <p className="mt-2xs max-w-[62ch] text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
          Every refund decided on the console, newest first, with where the money
          is now. A stay is refunded from its own page under the published
          schedule; open a stay from the Stays queue to decide one. The state
          beside each row is the wallet entry&apos;s own status, not a guess.
        </p>

        {refunds.state !== "ok" ? (
          <div className="mt-sm">
            <ui.QueueUnavailable />
          </div>
        ) : (
          <>
            <div className="mt-sm">
              <ui.StatRow>
                <ui.Stat
                  label="Returned"
                  value={formatMoney(refunds.data.totals.refundedMinor, locale)}
                  hint={`Across ${refunds.data.totals.count === 1 ? "1 refund" : `${refunds.data.totals.count} refunds`} on the platform`}
                />
                <ui.Stat
                  label="Recorded without a credit"
                  value={String(refunds.data.totals.notCredited)}
                  hint="A refund owed with no wallet entry behind it needs an engineer"
                  tone={refunds.data.totals.notCredited === 0 ? "success" : "danger"}
                />
              </ui.StatRow>
            </div>

            {refunds.data.rows.length === 0 ? (
              narrowed ? null : (
                <p className="mt-xs text-[var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
                  No refund has been decided yet.
                </p>
              )
            ) : (
              <ul className="mt-xs">
                {refunds.data.rows.map((refund) => (
                  <RefundRow key={refund.id} refund={refund} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {escrow.state === "ok" && escrow.data.disputes.length > 0 && (
        <section className="nf-card mb-md p-md sm:p-lg">
          <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
            Disputed holds waiting on a ruling
          </h2>
          <p className="mt-2xs max-w-[62ch] text-[var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-secondary)]">
            Somebody objected and the money is held until a person rules. Release
            pays the payee; refund returns it to the payer. Both people are sent
            your ruling word for word, and the transition is in the audit log.
            The full desk is at{" "}
            <Link href="/admin/escrow" className="underline">
              Escrow
            </Link>
            .
          </p>
          <ul className="mt-xs">
            {escrow.data.disputes.map((dispute) => (
              <li
                key={dispute.id}
                className="border-t border-[var(--nf-border-subtle)] py-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-md gap-y-2xs">
                  <span className="min-w-0">
                    <span className="block text-[var(--nf-text-body-sm)] text-[var(--nf-content-primary)]">
                      {dispute.listingTitle ?? "A listing that is no longer there"}
                      {" · "}
                      {dispute.payerName ?? "the payer"} paid, {dispute.payeeName ?? "the payee"}{" "}
                      waits
                    </span>
                    {dispute.disputeReason && (
                      <span className="block text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)]">
                        {dispute.disputeReason}
                      </span>
                    )}
                  </span>
                  <span className="nf-numeric text-[var(--nf-text-body-sm)] font-semibold">
                    {formatMoney(dispute.amountMinor, locale)}
                  </span>
                </div>
                <EscrowRuling
                  escrowId={dispute.id}
                  amountMinor={dispute.amountMinor}
                  locale={locale}
                  payerName={dispute.payerName}
                  payeeName={dispute.payeeName}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="nf-card p-md sm:p-lg">
        <h2 className="text-[var(--nf-text-body)] font-semibold text-[var(--nf-content-primary)]">
          The ledger, newest first
        </h2>
        {recent.length === 0 ? (
          narrowed ? null : (
          <p className="mt-xs text-[var(--nf-text-body-sm)] text-[var(--nf-content-muted)]">
            No money has moved yet.
          </p>
          )
        ) : (
          <ul className="mt-xs">
            {recent.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
