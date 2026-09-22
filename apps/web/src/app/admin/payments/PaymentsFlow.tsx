import Link from "next/link";
import { formatMoney, type Locale } from "@vallo/i18n";
import {
  PAYMENT_OUTCOMES,
  channelLabel,
  type PaymentOutcome,
  type PaymentsDesk,
} from "@/lib/admin/reads/payments";
import { StatusPill, type StatusTone } from "@/components/ui/StatusPill";
import type { AdminUi } from "../_components/ui";
import { CalmNote, EmptyChart, Framed, Kpi, NumberedPager, Panel, TableNote, Waiting } from "../money/_desk/Desk";
import { RankBars, RankFrame, SeriesChart, StatusBar, type StatusTone4 } from "../money/_desk/charts";
import { percentChange } from "@/lib/admin/reads/money-derive";
import { dayLabel } from "../bookings/BookingsDesk";

/**
 * The money coming in, drawn from `getPaymentsDesk`
 * (`lib/admin/reads/payments.ts`): four KPI cards of exact counts this week
 * against the week before, succeeded money per day (drawn only once two days
 * have some), attempts by channel, one status bar on the status four, and
 * every attempt in a numbered table.
 */

export const OUTCOME_WORD: Record<PaymentOutcome, string> = {
  succeeded: "Succeeded",
  initialised: "Started",
  abandoned: "Abandoned",
  failed: "Failed",
  refunded: "Refunded",
};
const OUTCOME_TONE: Record<PaymentOutcome, StatusTone> = {
  succeeded: "success",
  initialised: "warning",
  abandoned: "neutral",
  failed: "danger",
  refunded: "info",
};
const OUTCOME_TONE4: Record<PaymentOutcome, StatusTone4> = {
  succeeded: "good",
  initialised: "pending",
  abandoned: "bad",
  failed: "bad",
  refunded: "info",
};

export function PaymentsKpis({ desk }: { desk: PaymentsDesk | null }) {
  const w = desk?.week;
  const d = (k: PaymentOutcome | "started", upIsGood = true) =>
    w ? { percent: percentChange(w.thisWeek[k], w.lastWeek[k]), against: "vs the 7 days before", upIsGood } : null;
  return (
    <div className="nf-md-kpis">
      <Kpi label="Started" value={w ? String(w.thisWeek.started) : null} delta={d("started")} note="Checkouts and top-ups begun this week" />
      <Kpi label="Succeeded" value={w ? String(w.thisWeek.succeeded) : null} delta={d("succeeded")} note="Paid and settled this week" />
      <Kpi label="Failed" value={w ? String(w.thisWeek.failed) : null} delta={d("failed", false)} note="Refused or reversed this week" />
      <Kpi label="Abandoned" value={w ? String(w.thisWeek.abandoned) : null} delta={d("abandoned", false)} note="Started and not finished within a day" />
    </div>
  );
}

export function PaymentsCharts({ desk, locale }: { desk: PaymentsDesk | null; locale: Locale }) {
  if (!desk) {
    return (
      <Panel title="Money in per day">
        <Waiting title="Payments could not be read" body="Every checkout and top-up the platform has started. The read did not answer just now; reload in a moment." />
      </Panel>
    );
  }
  const days = desk.perDay;
  const activeDays = days.filter((x) => x.amountMinor > 0).length;
  const ticks = days.map((x, i) => (i % 5 === 0 || i === days.length - 1 ? dayLabel(x.day, locale) : ""));
  const t30 = desk.last30;
  const total30 = PAYMENT_OUTCOMES.reduce((s, o) => s + t30[o], 0);

  return (
    <>
      <div className="nf-md-grid nf-md-grid--main">
        <Panel title="Money in per day" hint="Succeeded, last 30 days">
          {activeDays < 2 ? (
            <EmptyChart
              height={200}
              yLabels={["₦0", "", "", "", ""]}
              xLabels={ticks}
              note={{
                title: activeDays === 0 ? "No payment succeeded in thirty days" : "One day of payments so far",
                fills: "The value of checkouts and top-ups that succeeded each day over the last thirty days.",
                creates: "Every payment the provider settles adds to its day. A line needs two days, so none is drawn.",
                action: { href: "/admin/money", label: "Open the money desk" },
              }}
            />
          ) : (
            <SeriesChart
              id="payments-volume"
              xLabels={days.map((x) => dayLabel(x.day, locale))}
              series={[{ name: "Money in", values: days.map((x) => x.amountMinor), rank: 0, area: true }]}
              label="Succeeded payments per day, last thirty days"
              yLabel={(v) => formatMoney(v, locale, "NGN", { compact: true })}
              readout={days.map((x) => ({
                title: dayLabel(x.day, locale, true),
                rows: [
                  { label: "Money in", value: formatMoney(x.amountMinor, locale) },
                  { label: "Payments", value: String(x.count) },
                ],
              }))}
            />
          )}
        </Panel>
        <Panel title="By channel" hint="Attempts, last 30 days">
          {desk.byChannel.length === 0 ? (
            <Framed frame={<RankFrame rows={4} />}>
              <CalmNote
                title="No payment attempt in thirty days"
                fills="Checkouts and top-ups by the channel they were paid through: card, bank transfer, USSD and the rest."
                creates="The channel is recorded when the provider confirms a top-up."
              />
            </Framed>
          ) : (
            <>
              <RankBars rows={desk.byChannel.slice(0, 6).map((c) => ({ label: c.channel, count: c.attempts }))} />
              <p className="nf-md-panel__foot">
                {desk.byChannel
                  .filter((c) => c.succeeded > 0)
                  .map((c) => `${c.channel}: ${formatMoney(c.succeededMinor, locale)} in`)
                  .join(" · ") || "Nothing succeeded on any channel in thirty days."}
              </p>
            </>
          )}
        </Panel>
      </div>
      <Panel title="Where payments ended" hint={`${total30} ${total30 === 1 ? "attempt" : "attempts"}, last 30 days`}>
        <StatusBar
          label="Payment attempts by outcome, last thirty days"
          segments={PAYMENT_OUTCOMES.map((o) => ({ key: o, label: OUTCOME_WORD[o], count: t30[o], tone: OUTCOME_TONE4[o] }))}
        />
        {total30 === 0 && (
          <div className="mt-md">
            <CalmNote
              title="No payment attempt in thirty days"
              fills="Where every checkout and top-up ended: succeeded, still in progress, abandoned, failed or refunded."
              creates="A guest paying for a stay or a person funding their wallet starts one."
            />
          </div>
        )}
      </Panel>
    </>
  );
}

export function PaymentsTable({
  desk,
  params,
  locale,
  ui,
}: {
  desk: PaymentsDesk | null;
  params: Record<string, string | undefined>;
  locale: Locale;
  ui: AdminUi;
}) {
  const link = (key: "outcome" | "kind", value: string | undefined) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== key && k !== "page") next.set(k, v);
    if (value) next.set(key, value);
    const qs = next.toString();
    return qs ? `/admin/payments?${qs}` : "/admin/payments";
  };
  const chip = (key: "outcome" | "kind", value: string | undefined, label: string) => {
    const on = (params[key] ?? undefined) === value;
    return (
      <Link key={`${key}-${value ?? "all"}`} href={link(key, on ? undefined : value)} className="nf-md-toggle" aria-pressed={on}>
        {label}
      </Link>
    );
  };
  const narrowed = Boolean(params.outcome || params.kind);

  return (
    <Panel title="Every payment" hint={desk ? `${desk.table.total} ${desk.table.total === 1 ? "attempt" : "attempts"}` : undefined}>
      <div className="mb-sm flex flex-wrap gap-xs" role="group" aria-label="Narrow the payments">
        {chip("outcome", undefined, "All outcomes")}
        {PAYMENT_OUTCOMES.map((o) => chip("outcome", o, OUTCOME_WORD[o]))}
      </div>
      <div className="mb-sm flex flex-wrap gap-xs" role="group" aria-label="Narrow by kind">
        {chip("kind", undefined, "Checkouts and top-ups")}
        {chip("kind", "checkout", "Booking checkouts")}
        {chip("kind", "topup", "Wallet top-ups")}
      </div>
      {!desk ? (
        <Waiting title="Payments could not be read" body="Every checkout and top-up with its reference, channel and outcome. The read did not answer just now." />
      ) : (
        <>
          <table className="nf-md-table">
            <thead>
              <tr>
                <th scope="col">Started</th>
                <th scope="col">Reference</th>
                <th scope="col">Kind</th>
                <th scope="col">Channel</th>
                <th scope="col">Outcome</th>
                <th scope="col" className="nf-md-num">Amount</th>
              </tr>
            </thead>
            <tbody>
              {desk.table.rows.length === 0 ? (
                <TableNote
                  columns={6}
                  note={
                    narrowed
                      ? { title: "Nothing matched that", fills: "No payment attempt has that outcome or kind.", action: { href: "/admin/payments", label: "Show every payment" } }
                      : {
                          title: "No payment has been started yet",
                          fills: "Every booking checkout and wallet top-up, with its reference, channel and where it ended.",
                          creates: "A guest paying for a stay or a person funding their wallet starts one.",
                        }
                  }
                />
              ) : (
                desk.table.rows.map((p) => (
                  <tr key={`${p.kind}-${p.id}`}>
                    <td className="nf-md-date" data-label="Started">
                      {ui.when(p.createdAt)}
                    </td>
                    <td data-label="Reference">
                      {/* The reference, never clipped: it is what the provider traces by. */}
                      <span className="nf-md-ref">{p.reference}</span>
                    </td>
                    <td data-label="Kind">
                      {p.kind === "checkout" && p.bookingId ? (
                        <Link href={`/admin/bookings/${p.bookingId}`} className="underline-offset-2 hover:underline">
                          Booking checkout
                        </Link>
                      ) : p.kind === "checkout" ? (
                        "Booking checkout"
                      ) : (
                        "Wallet top-up"
                      )}
                    </td>
                    <td className="nf-md-desc" data-label="Channel">
                      {channelLabel(p)}
                    </td>
                    <td data-label="Outcome">
                      <StatusPill tone={OUTCOME_TONE[p.outcome]}>{OUTCOME_WORD[p.outcome]}</StatusPill>
                    </td>
                    <td className="nf-md-num nf-md-strong" data-label="Amount">
                      {formatMoney(p.amountMinor, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {desk.table.total > 0 && (
            <NumberedPager base="/admin/payments" params={params} page={desk.table.page} total={desk.table.total} pageSize={desk.table.pageSize} noun="payments" />
          )}
        </>
      )}
    </Panel>
  );
}
