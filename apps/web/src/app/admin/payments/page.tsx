import type { Metadata } from "next";
import { formatMoney, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  getPaymentHealth,
  getSavedMethods,
  STALE_HOLD_MINUTES,
  type SavedMethods,
} from "@/lib/admin/payments-queries";
import { findAdminSubject, type SubjectLookup } from "@/lib/admin/queries";
import { adminUi, type AdminUi } from "../_components/ui";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { SweepHolds } from "./SweepHolds";
import { RemoveSavedMethod } from "./MethodLookup";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Payment and wallet health.
 *
 * THE QUESTION THIS SCREEN ANSWERS. "Is anybody's money stuck." It had no
 * screen. `private.wallets_overdrawn()` and `private.stale_withdrawal_holds()`
 * were written when the wallet layer landed and their public pass-throughs
 * carry EXECUTE for `service_role` only, so the nightly reconcile job could
 * call them and a person could not. The honest description of the old state is
 * that an operator asked by a user where their withdrawal went had to ask an
 * engineer to run SQL against production.
 *
 * THE ORDER IS THE PRIORITY, and it is not the order the data arrives in.
 * An overdrawn wallet comes first because it is the only finding here that
 * means the books are WRONG rather than slow: every other row on this page is
 * money in the wrong place, and that one is money that does not add up. It is
 * also the only one this console offers no button for, deliberately. A ledger
 * that has lost an argument with itself is not something to paper over with an
 * adjusting entry from a web form; it is an engineering incident, and the
 * screen says so instead of offering a fix that would destroy the evidence.
 *
 * Stale holds come second and carry the one action, because they are the
 * finding where somebody is actively short of their own money.
 *
 * Unsettled payments come last and are read-only: the reconcile route at
 * /api/paystack/reconcile is what re-asks the provider, and duplicating that as
 * a button here would give two code paths permission to decide a payment landed.
 */
/**
 * The payment-method lookup panel.
 *
 * "Which card is on my account" and "take that bank account off, I lost the
 * phone" are two of the commonest things support is asked, and until this
 * panel an operator could answer neither without SQL. The search is a GET so
 * the answer is a URL a colleague can open; the person is found by handle,
 * address or id through the console's one subject lookup; the cards are
 * shown as the processor filed them (brand, last four, expiry) and the
 * accounts masked to their tail, because an operator never needs more than
 * the tail to confirm "the one ending 4821" with the person on the phone.
 */
function LookupPanel({
  term,
  lookup,
  methods,
  ui,
}: {
  term: string;
  lookup: Awaited<ReturnType<typeof findAdminSubject>> | null;
  methods: Awaited<ReturnType<typeof getSavedMethods>> | null;
  ui: AdminUi;
}) {
  return (
    <ui.Section
      title="Saved cards and bank accounts"
      hint="Find a person by handle, email address or account id to see what they have saved to pay with or be paid to. Cards show what the processor filed, never a number. Accounts show their last four digits only."
    >
      <form method="get" action="/admin/payments" className="flex flex-wrap items-end gap-row">
        <label className="min-w-0 flex-1">
          <span className="nf-label">Handle, email or account id</span>
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="@handle, name@example.com, or an id"
            className="nf-field mt-inline-tight w-full"
          />
        </label>
        <button type="submit" className="nf-chip nf-chip--active shrink-0">
          Look up
        </button>
      </form>

      {term.length > 0 && <LookupResult lookup={lookup} methods={methods} ui={ui} />}
    </ui.Section>
  );
}

function LookupResult({
  lookup,
  methods,
  ui,
}: {
  lookup: Awaited<ReturnType<typeof findAdminSubject>> | null;
  methods: Awaited<ReturnType<typeof getSavedMethods>> | null;
  ui: AdminUi;
}) {
  if (!lookup || lookup.state !== "ok") {
    return (
      <div className="mt-sm">
        <ui.QueueUnavailable />
      </div>
    );
  }
  const found: SubjectLookup | null = lookup.data;
  if (found === null) {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        That does not read as a handle, an email address or an account id. Check it and try again.
      </p>
    );
  }
  if (found.state === "email-unavailable") {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        Looking a person up by email address is not switched on in this
        deployment yet. Search by their handle or their account id instead.
      </p>
    );
  }
  if (found.state === "none") {
    return (
      <p className="nf-body-sm mt-sm text-content-2">
        No account matches that {found.by === "email" ? "address" : found.by}.
      </p>
    );
  }

  const { subject } = found;
  const saved: SavedMethods | null = methods && methods.state === "ok" ? methods.data : null;

  return (
    <div className="mt-sm">
      <p className="nf-body font-semibold text-content">
        {subject.displayName ?? "No display name"}
        {subject.handle ? ` · @${subject.handle}` : ""}
      </p>
      {/* THE ID, UNCLIPPED: what an operator pastes into the money desk to
          find this person's wallet. */}
      <p className="font-mono text-[var(--nf-text-caption)] text-[var(--nf-content-secondary)] [overflow-wrap:anywhere] [user-select:all]">
        {subject.userId}
      </p>

      {saved === null ? (
        <div className="mt-sm">
          <ui.QueueUnavailable />
        </div>
      ) : (
        <>
          <h3 className="nf-h4 mt-group">Saved cards</h3>
          {saved.cards.length === 0 ? (
            <p className="nf-body-sm mt-row text-content-2">No card has been saved on this account.</p>
          ) : (
            <ul className="nf-rows mt-row">
              {saved.cards.map((card) => {
                const brand = card.cardType
                  ? card.cardType.charAt(0).toUpperCase() + card.cardType.slice(1)
                  : "Card";
                const describe = `${brand} ending ${card.last4 ?? "????"}`;
                return (
                  <li key={card.id} className="nf-row flex-wrap">
                    <span className="min-w-0 flex-1">
                      <span className="nf-body-sm block font-semibold text-content">
                        {describe}
                        {card.bank ? ` · ${card.bank}` : ""}
                      </span>
                      <span className="nf-caption block">
                        {card.expMonth && card.expYear
                          ? `Expires ${String(card.expMonth).padStart(2, "0")}/${card.expYear}`
                          : "Expiry not on file"}
                        {card.isDefault && !card.removedAt ? " · default" : ""}
                        {!card.reusable ? " · processor says no longer chargeable" : ""}
                        {" · saved "}
                        {ui.when(card.createdAt)}
                      </span>
                    </span>
                    {card.removedAt ? (
                      <ui.StatusChip label={`Removed ${ui.when(card.removedAt)}`} tone="neutral" />
                    ) : (
                      <RemoveSavedMethod kind="card" id={card.id} describe={describe} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <h3 className="nf-h4 mt-group">Bank accounts</h3>
          {saved.accounts.length === 0 ? (
            <p className="nf-body-sm mt-row text-content-2">
              No bank account has been filed on this account.
            </p>
          ) : (
            <ul className="nf-rows mt-row">
              {saved.accounts.map((account) => {
                const describe = `${account.bankName} ending ${account.accountNumberMasked.slice(-4)}`;
                return (
                  <li key={account.id} className="nf-row flex-wrap">
                    <span className="min-w-0 flex-1">
                      <span className="nf-body-sm block font-semibold text-content">
                        {account.bankName}
                        {" · "}
                        <span className="nf-numeric">{account.accountNumberMasked}</span>
                      </span>
                      <span className="nf-caption block">
                        {account.accountName}
                        {account.isDefault && !account.removedAt ? " · default" : ""}
                        {" · filed "}
                        {ui.when(account.createdAt)}
                      </span>
                    </span>
                    {account.removedAt ? (
                      <ui.StatusChip
                        label={`Removed ${ui.when(account.removedAt)}`}
                        tone="neutral"
                      />
                    ) : (
                      <RemoveSavedMethod kind="account" id={account.id} describe={describe} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);

  const params = await searchParams;
  const rawTerm = params["q"];
  const term = (Array.isArray(rawTerm) ? rawTerm[0] : rawTerm)?.trim() ?? "";

  const [read, lookup] = await Promise.all([
    getPaymentHealth(STALE_HOLD_MINUTES),
    term.length > 0 ? findAdminSubject(term) : Promise.resolve(null),
  ]);
  const methods =
    lookup && lookup.state === "ok" && lookup.data?.state === "found"
      ? await getSavedMethods(lookup.data.subject.userId)
      : null;
  /* The moment this page's rows were read, handed to the sweep control so its
     age arithmetic runs against the same clock the list was built from. */
  const asOf = new Date().toISOString();

  if (read.state !== "ok") {
    return (
      <div className="nf-console">
        <ui.QueueHeader
          title="Payments"
          lede="Money that is stuck, short, or waiting on the provider."
        />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { overdrawn, staleHolds, unsettled, totals, staleMinutes } = read.data;
  const healthy = overdrawn.length === 0 && staleHolds.length === 0 && unsettled.length === 0;

  return (
    <div className="nf-console">
      <ui.QueueHeader
        title="Payments"
        lede="Money that is stuck, short, or waiting on the provider. Everything here is read from the ledger itself rather than from a cached figure, so a number on this page is the number in the database."
        count={overdrawn.length + staleHolds.length}
      />

      <ui.StatRow>
        <ui.Stat
          label="Ledger shortfall"
          value={formatMoney(totals.shortfallMinor, locale)}
          hint={
            overdrawn.length === 0
              ? "Every wallet adds up"
              : `${overdrawn.length === 1 ? "1 wallet is" : `${overdrawn.length} wallets are`} below zero`
          }
          tone={overdrawn.length === 0 ? "success" : "danger"}
        />
        <ui.Stat
          label="Frozen by stuck holds"
          value={formatMoney(totals.frozenMinor, locale)}
          hint={
            staleHolds.length === 0
              ? "Nothing is held past its window"
              : `${staleHolds.length === 1 ? "1 withdrawal" : `${staleHolds.length} withdrawals`} older than ${staleMinutes} minutes`
          }
          tone={staleHolds.length === 0 ? "success" : "warning"}
        />
        <ui.Stat
          label="Waiting on the provider"
          value={formatMoney(totals.unsettledMinor, locale)}
          hint={
            unsettled.length === 0
              ? "Nothing unsettled in thirty days"
              : `${unsettled.length === 1 ? "1 payment" : `${unsettled.length} payments`} pending or failed`
          }
          tone={unsettled.length === 0 ? "success" : "neutral"}
        />
      </ui.StatRow>

      {healthy && (
        <ui.QueueEmpty
          title="The money is where it should be"
          body="No wallet is overdrawn, no withdrawal is held past its window, and the provider has settled everything it was sent in the last thirty days."
        />
      )}

      {overdrawn.length > 0 && (
        <ui.Section
          title="Overdrawn wallets"
          hint="A wallet whose settled entries sum below zero. This is not a delay, it is an arithmetic failure in the ledger, and it has no button here on purpose: an adjusting entry typed into a web form would bury the evidence an engineer needs to find the cause."
        >
          {/*
            A TABLE, BECAUSE THIS IS A TABLE.

            These three lists were flex rows inside a card, each hand-rolling
            the one thing a money column needs: `nf-numeric shrink-0` on the
            figure so the digits line up by place value. `components/ui/Table`
            owns that (`align="end"` right-aligns AND makes the figures
            tabular, because those always travel together), plus a sticky
            header, a row hover and a scroll box that takes the sideways scroll
            so the page never does. It was built for exactly this and F2-053
            records that the console used it zero times.

            NOT the queues, though, and that is the other half of the decision:
            every queue row carries a decision control, and a table of rows with
            buttons is worse on a phone than a card list. The console is used on
            a phone at eleven at night by `nav.ts`'s own account. These three are
            read-only columns of figures, which is the case a table wins.

            The wallet id is still never truncated: a wallet id is what an
            operator quotes to an engineer, and `user-select: all` means one tap
            takes the whole string rather than transcribing it.
          */}
          <Table caption="Overdrawn wallets" density="compact">
            <THead>
              <TR>
                <TH>Owner</TH>
                <TH>Wallet</TH>
                <TH align="end">Balance</TH>
              </TR>
            </THead>
            <TBody>
              {overdrawn.map((wallet) => (
                <TR key={wallet.walletId}>
                  <TD className="font-semibold text-[var(--nf-content-primary)]">
                    {wallet.ownerName ?? "Name not on file"}
                  </TD>
                  <TD className="[overflow-wrap:anywhere] [user-select:all]">
                    {wallet.walletId}
                  </TD>
                  <TD align="end" className="font-bold text-[var(--nf-state-error)]">
                    {formatMoney(wallet.balanceMinor, locale)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ui.Section>
      )}

      <ui.Section
        title="Stuck withdrawal holds"
        hint={`A withdrawal still marked pending after ${staleMinutes} minutes. The money is neither in the owner's spendable balance nor in their bank account.`}
      >
        {staleHolds.length === 0 ? (
          <ui.QueueEmpty
            title="No withdrawal is stuck"
            body="Every pending hold is inside its window, which means it is on its way rather than frozen."
          />
        ) : (
          <div className="nf-stack nf-stack--group">
            {/* The reference gets its own column and still never clips: it is
                what a stuck hold is traced by with the processor. */}
            <Table caption="Stuck withdrawal holds" density="compact">
              <THead>
                <TR>
                  <TH>Owner</TH>
                  <TH>Reference</TH>
                  <TH>Held since</TH>
                  <TH align="end">Amount</TH>
                </TR>
              </THead>
              <TBody>
                {staleHolds.map((hold) => (
                  <TR key={hold.reference}>
                    <TD className="font-semibold text-[var(--nf-content-primary)]">
                      {hold.ownerName ?? "Name not on file"}
                    </TD>
                    <TD className="[overflow-wrap:anywhere] [user-select:all]">
                      {hold.reference}
                    </TD>
                    <TD>{ui.when(hold.createdAt)}</TD>
                    <TD align="end" className="font-bold">
                      {formatMoney(hold.amountMinor, locale)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <SweepHolds
              holds={staleHolds}
              defaultMinutes={staleMinutes}
              locale={locale}
              asOf={asOf}
            />
          </div>
        )}
      </ui.Section>

      {unsettled.length > 0 && (
        <ui.Section
          title="Waiting on the provider"
          hint="Payments the provider has not settled, from the last thirty days. Re-asking the provider is the reconcile job's decision to take, not this screen's."
        >
          {/* The provider's reference gets the widest column: it is what an
              operator pastes into Paystack or Yellow Card to find out what
              actually happened, and it never clips. */}
          <Table caption="Payments waiting on the provider" density="compact">
            <THead>
              <TR>
                <TH>State</TH>
                <TH>Reference</TH>
                <TH>Provider</TH>
                <TH>Started</TH>
                <TH align="end">Amount</TH>
              </TR>
            </THead>
            <TBody>
              {unsettled.map((payment) => (
                <TR key={payment.id}>
                  <TD>
                    {/*
                      NOT A TERNARY OVER A FOUR-VALUE ENUM.

                      This read `status === "FAILED" ? "Failed" : "Pending"` for
                      both the word and the colour, so every value that is not
                      FAILED collapsed into one word in one colour.

                      WHAT THAT WAS AND WAS NOT, STATED ACCURATELY. It was not a
                      live falsehood: `admin_payment_health` selects
                      `status in ('PENDING','FAILED')`, so only two of the four
                      ever reach this row today. It was a binary written over a
                      thing that is not binary, which becomes a false statement
                      about money the day somebody widens that `in` list, on the
                      desk whose whole job is finding false statements about
                      money. And it was English on a four-language platform.

                      The word comes from the column's own vocabulary and the
                      tone from `toneForStatus`, which maps all four. A status
                      the reader could not name is null rather than "PENDING",
                      and renders as "not recorded" in neutral: see
                      `transactionStatus` in `payments-queries`. F2-060.
                    */}
                    <ui.StatusChip
                      status={payment.status ?? ""}
                      label={ui.columnLabel("transactionStatus", payment.status)}
                    />
                  </TD>
                  <TD className="font-semibold text-[var(--nf-content-primary)] [overflow-wrap:anywhere] [user-select:all]">
                    {payment.providerRef ?? payment.id}
                  </TD>
                  <TD>{payment.provider ?? "Unknown provider"}</TD>
                  <TD>{ui.when(payment.createdAt)}</TD>
                  <TD align="end" className="font-bold">
                    {formatMoney(payment.amountMinor, locale)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ui.Section>
      )}

      <LookupPanel term={term} lookup={lookup} methods={methods} ui={ui} />
    </div>
  );
}
