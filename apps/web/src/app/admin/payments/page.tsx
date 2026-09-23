import type { Metadata } from "next";
import { formatMoney, getDictionary, plural } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import {
  getPaymentHealth,
  getSavedMethods,
  STALE_HOLD_MINUTES,
} from "@/lib/admin/payments-queries";
import { findAdminSubject } from "@/lib/admin/queries";
import { getTermsStanding } from "@/lib/admin/legal-queries";
import { adminUi } from "../_components/ui";
import { fill } from "../_components/copy";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { SweepHolds } from "./SweepHolds";
import { LookupPanel } from "./LookupPanel";
import { getPaymentsDesk } from "@/lib/admin/reads/payments";
import { readPage } from "@/lib/admin/reads/money-derive";
import { LiveRefresh } from "../_components/LiveRefresh";
import { CalmNote, DeskHead, Panel, flatParams } from "../money/_desk/Desk";
import { PaymentsCharts, PaymentsKpis, PaymentsTable } from "./PaymentsFlow";
import "../money/_desk/desk.css";

/** Payment attempts per page. */
const PAYMENTS_PAGE_SIZE = 12;

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
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const ui = adminUi(t, locale);
  const c = t.admin.payments;

  const params = await searchParams;
  const rawTerm = params["q"];
  const term = (Array.isArray(rawTerm) ? rawTerm[0] : rawTerm)?.trim() ?? "";

  const flat = flatParams(params);
  const [read, lookup, flow] = await Promise.all([
    getPaymentHealth(STALE_HOLD_MINUTES),
    term.length > 0 ? findAdminSubject(term) : Promise.resolve(null),
    getPaymentsDesk({
      ...(flat.outcome ? { outcome: flat.outcome } : {}),
      ...(flat.kind ? { kind: flat.kind } : {}),
      page: readPage(params.page),
      pageSize: PAYMENTS_PAGE_SIZE,
    }),
  ]);
  const payments = flow.state === "ok" ? flow.data : null;
  const head = (
    <DeskHead title={t.admin.shell.nav.payments} lede={c.lede} />
  );
  const found =
    lookup && lookup.state === "ok" && lookup.data?.state === "found"
      ? lookup.data.subject.userId
      : null;
  /* Both reads for the same person, started together: the panel draws one
     block and a second round trip for the legal row would show as a stall. */
  const [methods, standing] = await Promise.all([
    found ? getSavedMethods(found) : Promise.resolve(null),
    found ? getTermsStanding(found) : Promise.resolve(null),
  ]);
  /* The moment this page's rows were read, handed to the sweep control so its
     age arithmetic runs against the same clock the list was built from. */
  const asOf = new Date().toISOString();

  if (read.state !== "ok") {
    return (
      <div className="nf-console nf-md">
        <LiveRefresh />
        {head}
        <PaymentsKpis desk={payments} locale={locale} />
        <PaymentsCharts desk={payments} locale={locale} />
        <PaymentsTable desk={payments} params={flat} locale={locale} ui={ui} />
        <ui.QueueUnavailable />
      </div>
    );
  }

  const { overdrawn, staleHolds, unsettled, totals, staleMinutes } = read.data;
  const healthy = overdrawn.length === 0 && staleHolds.length === 0 && unsettled.length === 0;

  return (
    <div className="nf-console nf-md">
      <LiveRefresh />
      {head}

      <PaymentsKpis desk={payments} locale={locale} />
      <PaymentsCharts desk={payments} locale={locale} />
      <PaymentsTable desk={payments} params={flat} locale={locale} ui={ui} />

      <Panel title={c.healthTitle} hint={c.healthHint}>
      <ui.StatRow>
        <ui.Stat
          label={c.shortfall}
          value={formatMoney(totals.shortfallMinor, locale)}
          hint={overdrawn.length === 0 ? c.addsUp : plural(overdrawn.length, c.belowZero, locale)}
          tone={overdrawn.length === 0 ? "success" : "danger"}
        />
        <ui.Stat
          label={c.frozen}
          value={formatMoney(totals.frozenMinor, locale)}
          hint={
            staleHolds.length === 0
              ? c.nothingHeld
              : fill(plural(staleHolds.length, c.olderThan, locale), { minutes: staleMinutes })
          }
          tone={staleHolds.length === 0 ? "success" : "warning"}
        />
        <ui.Stat
          label={c.waitingProvider}
          value={formatMoney(totals.unsettledMinor, locale)}
          hint={unsettled.length === 0 ? c.nothingUnsettled : plural(unsettled.length, c.pendingOrFailed, locale)}
          tone={unsettled.length === 0 ? "success" : "neutral"}
        />
      </ui.StatRow>

      {healthy && (
        <div className="mt-sm">
          <CalmNote
            kind="clear"
            title={c.clearTitle}
            fills={c.clearFills}
            creates={c.clearCreates}
          />
        </div>
      )}
      </Panel>

      {overdrawn.length > 0 && (
        <ui.Section
          title={c.overdrawnTitle}
          hint={c.overdrawnHint}
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
          <Table caption={c.overdrawnTitle} density="compact">
            <THead>
              <TR>
                <TH>{c.owner}</TH>
                <TH>{c.wallet}</TH>
                <TH align="end">{c.balance}</TH>
              </TR>
            </THead>
            <TBody>
              {overdrawn.map((wallet) => (
                <TR key={wallet.walletId}>
                  <TD className="font-semibold text-[var(--nf-content-primary)]">
                    {wallet.ownerName ?? c.nameNotOnFile}
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
        title={c.stuckTitle}
        hint={fill(c.stuckHint, { minutes: staleMinutes })}
      >
        {staleHolds.length === 0 ? (
          <CalmNote
            kind="clear"
            title={c.stuckNoneTitle}
            fills={c.stuckNoneFills}
            creates={c.stuckNoneCreates}
          />
        ) : (
          <div className="nf-stack nf-stack--group">
            {/* The reference gets its own column and still never clips: it is
                what a stuck hold is traced by with the processor. */}
            <Table caption={c.stuckTitle} density="compact">
              <THead>
                <TR>
                  <TH>{c.owner}</TH>
                  <TH>{c.reference}</TH>
                  <TH>{c.heldSince}</TH>
                  <TH align="end">{c.amount}</TH>
                </TR>
              </THead>
              <TBody>
                {staleHolds.map((hold) => (
                  <TR key={hold.reference}>
                    <TD className="font-semibold text-[var(--nf-content-primary)]">
                      {hold.ownerName ?? c.nameNotOnFile}
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
          title={c.waitingProvider}
          hint={c.waitingHint}
        >
          {/* The provider's reference gets the widest column: it is what an
              operator pastes into Paystack or Yellow Card to find out what
              actually happened, and it never clips. */}
          <Table caption={c.waitingCaption} density="compact">
            <THead>
              <TR>
                <TH>{c.state}</TH>
                <TH>{c.reference}</TH>
                <TH>{c.provider}</TH>
                <TH>{c.started}</TH>
                <TH align="end">{c.amount}</TH>
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
                  <TD>{payment.provider ?? c.unknownProvider}</TD>
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

      <LookupPanel
        term={term}
        lookup={lookup}
        methods={methods}
        standing={standing}
        ui={ui}
        locale={locale}
      />
    </div>
  );
}
