import "@/app/css/referral-desk.css";
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { countOf, formatDate, formatMoney, formatNumber, type Dictionary, type Locale } from "@vallo/i18n/core";
import { panelClass } from "@/components/ui/Panel";
import { Badge, CalmNote, PageHead, Panel, PanelUnavailable, ReadOnlyNote, TabRow } from "../_components/panels";
import {
  bucketCounts,
  isStuck,
  memberLabel,
  referralsHref,
  requirementWords,
  riskReasonWords,
  readSignal,
  type ReferralQuery,
} from "@/lib/admin/reads/referrals-model";
import type {
  BudgetPeriodView,
  CampaignView,
  ClusterGroup,
  GraphRead,
  PayoutItem,
  ReferralDesk as DeskData,
  ReviewItem,
} from "@/lib/admin/reads/referrals";
import type { Read } from "@/lib/admin/reads/shared";
import { BudgetControl, PayoutDecisionControl, ReferralDecisionControl, type BudgetMonthOption } from "./ReferralControls";
import { ReferralGraph } from "./ReferralGraph";

/**
 * THE REFERRAL DESK (`/admin/referrals`).
 *
 * Top row: what Vallo owes in rewards, the month's budget used against the
 * cap (with the control to set it), and referrals by outcome; under it the
 * live campaign and its terms. Then three sections, chosen by `?tab=` so a
 * section is an address: the review queue, the fraud view (groups, then who
 * invited whom) and payouts.
 *
 * It decides nothing itself. The page reads (`lib/admin/reads/referrals.ts`)
 * and hands the results in, so every state below (clear, unreadable, empty)
 * can be drawn from fixtures in the preview and the tests. The three
 * decisions are `ReferralControls.tsx`, each one a call to an audited
 * function.
 */

type Copy = Dictionary["referralDesk"];

export type ReferralTabData = {
  review?: Read<{ items: ReviewItem[]; total: number }>;
  fraud?: Read<{ groups: ClusterGroup[] }>;
  graph?: { member: string | null; usingDefault: boolean; read: Read<GraphRead> | null };
  payouts?: Read<{ waiting: PayoutItem[]; inFlight: PayoutItem[] }>;
};

function day(iso: string, locale: Locale): string {
  return formatDate(new Date(iso), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });
}

function monthName(month: string, locale: Locale): string {
  return formatDate(new Date(`${month.slice(0, 7)}-15T12:00:00Z`), locale, { month: "long", year: "numeric", timeZone: "UTC" });
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** A template with nodes in its slots ("{referrer} invited {invited}"), so a name can be a link and the sentence stays one translatable string. */
function slots(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return key && key in values ? <Fragment key={i}>{values[key]}</Fragment> : <Fragment key={i}>{part}</Fragment>;
  });
}

export function ReferralDesk({
  query,
  locale,
  copy,
  desk,
  tab,
  now,
}: {
  query: ReferralQuery;
  locale: Locale;
  copy: Copy;
  desk: Read<DeskData>;
  tab: ReferralTabData;
  now: number;
}) {
  const money = (minor: number) => formatMoney(minor, locale);
  const data = desk.state === "ok" ? desk.data : null;
  const waitingReferrals = data?.liability.referralsUnderReview ?? 0;
  const waitingPayouts = data?.liability.payoutsUnderReview ?? 0;

  return (
    <div className="nf-console" data-testid="referral-desk">
      <PageHead
        title={copy.title}
        lede={copy.lede}
        action={data ? <ProgrammeBadge programme={data.programme} copy={copy} /> : undefined}
      />

      {data ? (
        <>
          <TopRow desk={data} locale={locale} copy={copy} money={money} />
          <CampaignPanel live={data.live} others={data.others} locale={locale} copy={copy} money={money} />
          {data.liability.transferIncidents > 0 ? (
            <p className="nf-rdesk-note nf-rdesk-note--warn mb-md" role="note">
              {copy.payouts.incidents.replace("{count}", formatNumber(data.liability.transferIncidents, locale))}
            </p>
          ) : null}
        </>
      ) : (
        <Panel title={copy.title}>
          <PanelUnavailable what={copy.top.label} locale={locale} />
        </Panel>
      )}

      <div className="mt-md">
        <TabRow
          label={copy.tabs.label}
          items={[
            { key: "review", href: referralsHref(query, { tab: "review" }), label: copy.tabs.review, active: query.tab === "review", count: waitingReferrals },
            { key: "fraud", href: referralsHref(query, { tab: "fraud" }), label: copy.tabs.fraud, active: query.tab === "fraud" },
            { key: "payouts", href: referralsHref(query, { tab: "payouts" }), label: copy.tabs.payouts, active: query.tab === "payouts", count: waitingPayouts },
          ]}
        />
      </div>

      <div className="mt-md grid gap-md">
        {query.tab === "review" ? <ReviewQueue read={tab.review} locale={locale} copy={copy} money={money} query={query} /> : null}
        {query.tab === "fraud" ? <FraudView fraud={tab.fraud} graph={tab.graph} query={query} locale={locale} copy={copy} money={money} /> : null}
        {query.tab === "payouts" ? (
          <Payouts read={tab.payouts} payoutsEnabled={data?.liability.payoutsEnabled ?? true} locale={locale} copy={copy} money={money} now={now} />
        ) : null}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- the top */

function ProgrammeBadge({ programme, copy }: { programme: DeskData["programme"]; copy: Copy }) {
  const p = copy.programme;
  if (programme.open) return <Badge tone="success">{p.open}</Badge>;
  const word =
    programme.reason === "no_campaign"
      ? p.pausedNoCampaign
      : programme.reason === "no_budget"
        ? p.pausedNoBudget
        : programme.reason === "budget_reached"
          ? p.pausedBudgetReached
          : p.paused;
  return <Badge tone="pending">{word}</Badge>;
}

function TopRow({
  desk,
  locale,
  copy,
  money,
}: {
  desk: DeskData;
  locale: Locale;
  copy: Copy;
  money: (minor: number) => string;
}) {
  const { liability: l } = desk;
  const t = copy.top;
  const buckets = bucketCounts(desk.counts);
  const waiting = l.referralsUnderReview + l.payoutsUnderReview;

  const thisMonth = l.month ?? desk.budgets[0]?.month ?? null;
  const monthStart = thisMonth;
  const nextMonth = (() => {
    if (!monthStart) return null;
    const [y, m] = monthStart.split("-").map(Number) as [number, number];
    return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  })();
  const budgetOf = (month: string): BudgetPeriodView | undefined => desk.budgets.find((b) => b.month === month);
  const options: BudgetMonthOption[] = [monthStart, nextMonth]
    .filter((m): m is string => m !== null)
    .map((month, i) => {
      const period = budgetOf(month);
      const name = monthName(month, locale);
      return {
        value: month,
        name,
        label: (i === 0 ? copy.budget.thisMonth : copy.budget.nextMonth).replace("{month}", name),
        capMinor: i === 0 ? (l.budgetCapMinor ?? period?.capMinor ?? null) : (period?.capMinor ?? null),
        committedMinor: i === 0 ? (l.budgetCommittedMinor ?? period?.committedMinor ?? 0) : (period?.committedMinor ?? 0),
      };
    });

  const cap = l.budgetCapMinor;
  const committed = l.budgetCommittedMinor ?? 0;
  const hasRow = cap !== null;
  const percent = cap && cap > 0 ? Math.min(100, Math.round((committed / cap) * 100)) : 0;
  const over = cap !== null && committed > cap;

  return (
    <section className="nf-rdesk-top" aria-label={t.label}>
      {/* Owed in rewards. */}
      <div className={panelClass({ variant: "card", className: "nf-rdesk-card" })} data-testid="top-owed">
        <span className="nf-rdesk-label">{t.owedTitle}</span>
        <span className="nf-rdesk-figure nf-numeric">{money(l.owedMinor)}</span>
        <p className="nf-rdesk-note">{t.owedNote}</p>
        <ul className="nf-rdesk-sub">
          <li>{fill(t.owedPending, { amount: money(l.pendingMinor) })}</li>
          <li>{fill(t.owedPaid, { amount: money(l.paidMinor) })}</li>
          {l.reversedAfterPaidMinor > 0 ? <li>{fill(t.owedReversed, { amount: money(l.reversedAfterPaidMinor) })}</li> : null}
        </ul>
      </div>

      {/* Budget used against the cap. */}
      <div className={panelClass({ variant: "card", className: "nf-rdesk-card" })} data-testid="top-budget">
        <span className="nf-rdesk-label">{t.budgetTitle}</span>
        {hasRow ? (
          <>
            <span className="nf-rdesk-figure nf-numeric">
              {money(committed)}
              <span className="nf-rdesk-note" style={{ marginInlineStart: "0.4em" }}>
                {fill(t.budgetOf, { cap: money(cap) })}
              </span>
            </span>
            <div
              className="nf-rdesk-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={fill(t.budgetUsed, { percent: `${percent}%`, month: thisMonth ? monthName(thisMonth, locale) : "" })}
              data-over={over ? "" : undefined}
            >
              <span className="nf-rdesk-bar__fill" style={{ width: `${percent}%` }} />
            </div>
            <p className="nf-rdesk-note">{fill(t.budgetUsed, { percent: `${percent}%`, month: thisMonth ? monthName(thisMonth, locale) : "" })}</p>
            {over ? <p className="nf-rdesk-note nf-rdesk-note--warn">{t.budgetOver}</p> : null}
          </>
        ) : (
          <>
            <span className="nf-rdesk-figure nf-rdesk-figure--sm">
              {fill(t.budgetNone, { month: thisMonth ? monthName(thisMonth, locale) : "" })}
            </span>
            <p className="nf-rdesk-note">{t.budgetNoneNote}</p>
          </>
        )}
        <div className="nf-rdesk-card__foot">
          {options.length > 0 ? <BudgetControl months={options} locale={locale} copy={copy.budget} hasBudget={hasRow} /> : null}
        </div>
      </div>

      {/* Referrals by outcome. */}
      <div className={panelClass({ variant: "card", className: "nf-rdesk-card" })} data-testid="top-counts">
        <span className="nf-rdesk-label">{t.countsTitle}</span>
        <dl className="nf-rdesk-triple">
          <div>
            <dt>{t.qualified}</dt>
            <dd className="nf-numeric" data-testid="count-qualified">{formatNumber(buckets.qualified, locale)}<small>{t.qualifiedNote}</small></dd>
          </div>
          <div>
            <dt>{t.pending}</dt>
            <dd className="nf-numeric" data-testid="count-pending">{formatNumber(buckets.pending, locale)}<small>{t.pendingNote}</small></dd>
          </div>
          <div>
            <dt>{t.reversed}</dt>
            <dd className="nf-numeric" data-testid="count-reversed">{formatNumber(buckets.reversed, locale)}<small>{t.reversedNote}</small></dd>
          </div>
        </dl>
        <p className={`nf-rdesk-note${waiting > 0 ? " nf-rdesk-note--warn" : ""}`}>
          {waiting > 0 ? fill(t.waitingOnYou, { count: formatNumber(waiting, locale) }) : t.nothingWaiting}
        </p>
        {Object.keys(l.blockedOn).length > 0 ? (
          <>
            <p className="nf-rdesk-label">{copy.blockedOn.title}</p>
            <ul className="nf-rdesk-sub" aria-label={copy.blockedOn.title}>
              {Object.entries(l.blockedOn).map(([reason, n]) => (
                <li key={reason}>
                  <span className="nf-numeric">{formatNumber(n, locale)}</span>
                  <span>{(copy.blockedOn as Record<string, string>)[reason] ?? reason.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ the campaign */

function windowLine(c: CampaignView, copy: Copy): string | null {
  if (c.reviewDays === null || c.reviewHours === null) return null;
  const parts: string[] = [];
  if (c.reviewDays > 0) parts.push(copy.campaign.windowDays.replace("{days}", String(c.reviewDays)));
  if (c.reviewHours > 0) parts.push(copy.campaign.windowHours.replace("{hours}", String(c.reviewHours)));
  return parts.length > 0 ? parts.join(" ") : null;
}

function CampaignPanel({
  live,
  others,
  locale,
  copy,
  money,
}: {
  live: CampaignView | null;
  others: CampaignView[];
  locale: Locale;
  copy: Copy;
  money: (minor: number) => string;
}) {
  const c = copy.campaign;
  const statusWord = (s: CampaignView["status"]) =>
    s === "draft" ? c.statusDraft : s === "active" ? c.statusActive : s === "paused" ? c.statusPaused : c.statusEnded;
  const requirementCopy = copy.requirements as Record<string, string>;

  return (
    <Panel title={c.title} id="referral-campaign">
      {live ? (
        <div className="grid gap-md" data-testid="live-campaign">
          <p className="nf-rdesk-item__who">
            {live.title} <span className="nf-rdesk-note">({live.slug})</span>{" "}
            <Badge tone="success">{c.statusActive}</Badge>
          </p>
          <dl className="nf-rdesk-terms">
            <div>
              <dt>{c.reward}</dt>
              <dd className="nf-numeric">{money(live.rewardMinor)}<small>{c.rewardNote}</small></dd>
            </div>
            <div>
              <dt>{c.cap}</dt>
              <dd className="nf-numeric">{money(live.memberCapMinor)}<small>
                {live.rewardMinor > 0
                  ? fill(c.capNote, {
                      count: formatNumber(Math.floor(live.memberCapMinor / live.rewardMinor), locale),
                      amount: money(live.memberCapMinor),
                    })
                  : ""}
              </small></dd>
            </div>
            <div>
              <dt>{c.window}</dt>
              <dd>{windowLine(live, copy) ?? "-"}<small>{c.windowNote}</small></dd>
            </div>
          </dl>
          <div>
            <h3 className="nf-rdesk-label">{c.counts}</h3>
            <ul className="nf-rdesk-reqs">
              {live.requirementKeys.map((key) => (
                <li key={key}>{requirementWords(key, requirementCopy)}</li>
              ))}
            </ul>
          </div>
          <p className="nf-rdesk-note">{fill(c.since, { date: day(live.startsAt, locale) })}</p>
          <details>
            <summary className="nf-rdesk-label">{c.ruling}</summary>
            <p className="nf-rdesk-note mt-xs">{live.reason || c.noRuling}</p>
          </details>
        </div>
      ) : (
        <CalmNote kind="info" title={c.none} fills={c.noneBody} />
      )}

      {others.length > 0 ? (
        <div className="mt-md grid gap-xs">
          <h3 className="nf-rdesk-label">{c.others}</h3>
          <p className="nf-rdesk-note">{c.othersNote}</p>
          <ul className="nf-rdesk-earlier" data-testid="other-campaigns">
            {others.map((o) => (
              <li key={o.slug}>
                <span>
                  {o.title} <span className="nf-rdesk-note">({o.slug})</span>
                </span>
                <span className="nf-numeric">{money(o.rewardMinor)}</span>
                <span className="nf-rdesk-note">
                  {o.endsAt ? fill(c.endedOn, { date: day(o.endsAt, locale) }) : fill(c.startsOn, { date: day(o.startsAt, locale) })}
                </span>
                <Badge tone={o.status === "ended" ? "info" : "pending"}>{statusWord(o.status)}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

/* ------------------------------------------------------------- review queue */

function Person({ id, name, copy }: { id: string; name: string | null; copy: Copy }) {
  return (
    <Link href={`/admin/people/${id}`}>{memberLabel(id, name, copy.common.unnamed)}</Link>
  );
}

function ReasonChips({ reasons, copy }: { reasons: string[]; copy: Copy }) {
  return (
    <ul className="nf-rdesk-chips">
      {reasons.map((reason) => (
        <li key={reason} className="nf-rdesk-chip" data-strong={reason === "shared_payout_destination" || reason === "circular_referral" || reason === "identity_denylisted" ? "" : undefined}>
          {riskReasonWords(reason, copy.reasons)}
        </li>
      ))}
    </ul>
  );
}

function ReviewQueue({
  read,
  locale,
  copy,
  money,
  query,
}: {
  read: ReferralTabData["review"];
  locale: Locale;
  copy: Copy;
  money: (minor: number) => string;
  query: ReferralQuery;
}) {
  const r = copy.review;
  return (
    <Panel title={r.title} id="referral-review">
      <p className="nf-rdesk-note mb-md">{r.lede}</p>
      {!read || read.state === "unavailable" ? (
        <PanelUnavailable what={r.unavailableWhat} locale={locale} />
      ) : read.data.items.length === 0 ? (
        <CalmNote kind="clear" title={r.emptyTitle} fills={r.emptyBody} />
      ) : (
        <>
          {read.data.total > read.data.items.length ? (
            <p className="nf-rdesk-note mb-md">{fill(r.showing, { shown: String(read.data.items.length), total: String(read.data.total) })}</p>
          ) : null}
          <ul className="nf-rdesk-list" data-testid="review-list">
            {read.data.items.map((item) => {
              const referrer = memberLabel(item.referrerId, item.referrerName, copy.common.unnamed);
              const invited = memberLabel(item.referredId, item.referredName, copy.common.unnamed);
              const rewardLabel = item.rewardMinor === null ? r.noReward : money(item.rewardMinor);
              return (
                <li key={item.id} className="nf-rdesk-item" data-testid="review-item">
                  <div className="nf-rdesk-item__head">
                    <p className="nf-rdesk-item__who">
                      {slots(r.invitedBy, {
                        referrer: <Person id={item.referrerId} name={item.referrerName} copy={copy} />,
                        invited: <Person id={item.referredId} name={item.referredName} copy={copy} />,
                      })}
                    </p>
                    {item.rewardMinor === null ? (
                      <span className="nf-rdesk-note">{rewardLabel}</span>
                    ) : (
                      <span className="nf-rdesk-item__amount nf-numeric">{rewardLabel}</span>
                    )}
                  </div>
                  <ul className="nf-rdesk-item__meta">
                    {item.qualifiedAt ? <li>{fill(r.qualified, { date: day(item.qualifiedAt, locale) })}</li> : null}
                    {item.attributedAt ? <li>{fill(r.joined, { date: day(item.attributedAt, locale) })}</li> : null}
                    {item.campaign ? <li>{fill(r.campaign, { slug: item.campaign })}</li> : null}
                  </ul>
                  <div className="nf-rdesk-item__signals">
                    <h3>{r.riskTitle}</h3>
                    <div className="flex flex-wrap items-center gap-xs">
                      <Badge tone={item.riskScore >= 40 ? "error" : item.riskScore > 0 ? "pending" : "info"}>
                        {fill(r.risk, { score: String(item.riskScore) })}
                      </Badge>
                      {item.reviewReason ? <span className="nf-rdesk-note">{fill(r.sentBecause, { reason: item.reviewReason })}</span> : null}
                    </div>
                    {item.riskReasons.length > 0 ? <ReasonChips reasons={item.riskReasons} copy={copy} /> : <p className="nf-rdesk-note">{r.noSignals}</p>}
                    {item.cluster ? (
                      <>
                        <p className="nf-rdesk-note">
                          <strong>{r.group}.</strong>{" "}
                          {fill(r.groupLine, {
                            score: fill(r.risk, { score: String(item.cluster.score) }),
                            people: countOf(item.cluster.members, "people", locale),
                            amount: money(item.cluster.exposureMinor),
                          })}
                          .{" "}
                          {item.cluster.nonNetwork ? r.groupNonNetwork : r.groupNetworkOnly}.
                        </p>
                        {item.cluster.reasons.length > 0 ? <ReasonChips reasons={item.cluster.reasons} copy={copy} /> : null}
                        <Link href={`${referralsHref(query, { tab: "fraud", member: item.referrerId })}#referral-graph-panel`} className="nf-rdesk-note underline underline-offset-4">
                          {r.seeInvitations}
                        </Link>
                      </>
                    ) : null}
                  </div>
                  <ReferralDecisionControl referralId={item.id} referrer={referrer} invited={invited} rewardLabel={rewardLabel} copy={r} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

/* ---------------------------------------------------------------- fraud view */

function FraudView({
  fraud,
  graph,
  query,
  locale,
  copy,
  money,
}: {
  fraud: ReferralTabData["fraud"];
  graph: ReferralTabData["graph"];
  query: ReferralQuery;
  locale: Locale;
  copy: Copy;
  money: (minor: number) => string;
}) {
  const f = copy.fraud;
  const g = copy.graph;
  return (
    <>
      <Panel title={f.title} id="referral-fraud">
        <p className="nf-rdesk-note mb-md">{f.lede}</p>
        {!fraud || fraud.state === "unavailable" ? (
          <PanelUnavailable what={f.unavailableWhat} locale={locale} />
        ) : fraud.data.groups.length === 0 ? (
          <CalmNote kind="clear" title={f.emptyTitle} fills={f.emptyBody} />
        ) : (
          <ul className="nf-rdesk-list" data-testid="cluster-list">
            {fraud.data.groups.map((group) => (
              <li key={group.referrerId} className="nf-rdesk-item" data-testid="cluster-item">
                <div className="nf-rdesk-item__head">
                  <p className="nf-rdesk-item__who">
                    <Person id={group.referrerId} name={group.referrerName} copy={copy} />
                  </p>
                  <span className="nf-rdesk-item__amount nf-numeric" aria-label={`${f.stake} ${money(group.exposureMinor)}`}>
                    {money(group.exposureMinor)}
                  </span>
                </div>
                <ul className="nf-rdesk-item__meta">
                  <li>{countOf(group.members, "people", locale)}</li>
                  <li>{fill(copy.review.risk, { score: String(group.score) })}</li>
                  <li>{group.nonNetwork ? f.strong : f.weak}</li>
                </ul>
                {group.reasons.length > 0 ? <ReasonChips reasons={group.reasons} copy={copy} /> : null}
                {group.signals.length > 0 ? (
                  <div className="nf-rdesk-item__signals">
                    <h3>{f.sharedHeading}</h3>
                    <ul className="nf-rdesk-sub">
                      {group.signals.map((s) => {
                        const sig = readSignal(s.signal);
                        const count = formatNumber(s.sharedBy, locale);
                        return (
                          <li key={s.signal}>
                            {sig.kind === "device"
                              ? fill(f.sharedDevice, { count, token: sig.token })
                              : sig.kind === "network"
                                ? fill(f.sharedNetwork, { count, token: sig.token })
                                : fill(f.sharedOther, { count })}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <div className="nf-rdesk-actions">
                  <Link
                    href={`${referralsHref(query, { tab: "fraud", member: group.referrerId })}#referral-graph-panel`}
                    className="nf-btn nf-btn--glass nf-btn--sm"
                  >
                    {f.seeInvitations}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="nf-rdesk-note mt-md">{f.note}</p>
      </Panel>

      <Panel title={g.title} id="referral-graph-panel">
        <p className="nf-rdesk-note mb-md">{graph?.usingDefault ? g.ledeDefault : g.lede}</p>
        <form method="get" action="/admin/referrals" className="nf-rdesk-form" aria-label={g.formLabel}>
          <input type="hidden" name="tab" value="fraud" />
          <label className="block">
            <span className="nf-label">{g.formLabel}</span>
            <input
              name="member"
              className="nf-field"
              defaultValue={graph?.member ?? ""}
              autoComplete="off"
              spellCheck={false}
              placeholder="00000000-0000-4000-8000-000000000000"
              pattern="[0-9a-fA-F\-]{36}"
            />
            <span className="nf-caption">{g.formHelp}</span>
          </label>
          <button type="submit" className="nf-btn nf-btn--primary nf-btn--sm">
            {g.formCta}
          </button>
          {query.member ? (
            <Link href={referralsHref(query, { member: null })} className="nf-btn nf-btn--glass nf-btn--sm">
              {g.formClear}
            </Link>
          ) : null}
        </form>
        <GraphBody graph={graph} locale={locale} copy={copy} />
        <div className="mt-md">
          <ReadOnlyNote locale={locale} />
        </div>
      </Panel>
    </>
  );
}

function GraphBody({ graph, locale, copy }: { graph: ReferralTabData["graph"]; locale: Locale; copy: Copy }) {
  const g = copy.graph;
  if (!graph || !graph.member) return <CalmNote kind="info" title={g.empty} fills={g.emptyBody} />;
  if (!graph.read || graph.read.state === "unavailable") return <PanelUnavailable what={g.unavailableWhat} locale={locale} />;
  if (graph.read.data.edges.length === 0) {
    return (
      <CalmNote
        kind="info"
        title={g.noEdges}
        fills={g.emptyBody}
        action={{ href: `/admin/people/${graph.member}`, label: g.openFile }}
      />
    );
  }
  return <ReferralGraph edges={graph.read.data.edges} names={graph.read.data.names} focus={graph.member} copy={copy} locale={locale} />;
}

/* ------------------------------------------------------------------ payouts */

function Payouts({
  read,
  payoutsEnabled,
  locale,
  copy,
  money,
  now,
}: {
  read: ReferralTabData["payouts"];
  payoutsEnabled: boolean;
  locale: Locale;
  copy: Copy;
  money: (minor: number) => string;
  now: number;
}) {
  const p = copy.payouts;
  const who = (item: PayoutItem) => item.accountName || memberLabel(item.memberId, item.memberName, copy.common.unnamed);
  const toLine = (item: PayoutItem) =>
    item.accountName ? fill(p.to, { name: item.accountName, last4: item.accountLast4 }) : fill(p.toNoName, { last4: item.accountLast4 });
  const stateWord = (s: PayoutItem["status"]) =>
    s === "processing" ? p.stateProcessing : s === "sent" ? p.stateSent : s === "unknown" ? p.stateUnknown : s;

  return (
    <>
      <Panel title={p.title} id="referral-payouts">
        <p className="nf-rdesk-note">{p.lede}</p>
        <p className="nf-rdesk-note mt-xs mb-md" data-testid="payout-how">
          {p.how}
        </p>
        {!payoutsEnabled ? (
          <p className="nf-rdesk-note nf-rdesk-note--warn mb-md" role="note" data-testid="payouts-off">
            {p.off}
          </p>
        ) : null}
        {!read || read.state === "unavailable" ? (
          <PanelUnavailable what={p.unavailableWhat} locale={locale} />
        ) : read.data.waiting.length === 0 ? (
          <CalmNote kind="clear" title={p.emptyTitle} fills={p.emptyBody} />
        ) : (
          <ul className="nf-rdesk-list" data-testid="payout-list">
            {read.data.waiting.map((item) => (
              <li key={item.id} className="nf-rdesk-item" data-testid="payout-item">
                <div className="nf-rdesk-item__head">
                  <p className="nf-rdesk-item__who">
                    <Person id={item.memberId} name={item.memberName} copy={copy} />
                  </p>
                  <span className="nf-rdesk-item__amount nf-numeric">{money(item.amountMinor)}</span>
                </div>
                <ul className="nf-rdesk-item__meta">
                  <li>{toLine(item)}</li>
                  <li>{fill(p.asked, { date: day(item.createdAt, locale) })}</li>
                  <li>
                    {p.reference} <span className="font-mono">{item.reference}</span>
                  </li>
                </ul>
                <div className="nf-rdesk-item__signals">
                  <h3>{p.riskTitle}</h3>
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge tone={item.riskScore >= 40 ? "error" : item.riskScore > 0 ? "pending" : "info"}>
                      {fill(copy.review.risk, { score: String(item.riskScore) })}
                    </Badge>
                  </div>
                  {item.riskReasons.length > 0 ? <ReasonChips reasons={item.riskReasons} copy={copy} /> : <p className="nf-rdesk-note">{p.noSignals}</p>}
                </div>
                <PayoutDecisionControl
                  payoutId={item.id}
                  mode="waiting"
                  who={who(item)}
                  amountLabel={money(item.amountMinor)}
                  last4={item.accountLast4}
                  canRelease={item.hasRecipient}
                  copy={p}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={p.inFlightTitle} id="referral-inflight">
        <p className="nf-rdesk-note mb-md">{p.inFlightLede}</p>
        {!read || read.state === "unavailable" ? (
          <PanelUnavailable what={p.unavailableWhat} locale={locale} />
        ) : read.data.inFlight.length === 0 ? (
          <CalmNote kind="clear" title={p.inFlightEmpty} fills={p.inFlightEmptyBody} />
        ) : (
          <ul className="nf-rdesk-list" data-testid="inflight-list">
            {read.data.inFlight.map((item) => {
              const stuck = isStuck(item.status, item.createdAt, now);
              return (
                <li key={item.id} className="nf-rdesk-item" data-testid="inflight-item">
                  <div className="nf-rdesk-item__head">
                    <p className="nf-rdesk-item__who">
                      <Person id={item.memberId} name={item.memberName} copy={copy} />
                    </p>
                    <span className="nf-rdesk-item__amount nf-numeric">{money(item.amountMinor)}</span>
                  </div>
                  <ul className="nf-rdesk-item__meta">
                    <li>{toLine(item)}</li>
                    <li>{fill(p.asked, { date: day(item.createdAt, locale) })}</li>
                    <li>
                      {p.reference} <span className="font-mono">{item.reference}</span>
                    </li>
                  </ul>
                  <div className="flex flex-wrap items-center gap-xs">
                    <Badge tone={item.status === "unknown" ? "error" : "info"}>{stateWord(item.status)}</Badge>
                    {stuck ? <Badge tone="pending">{p.stuck}</Badge> : null}
                  </div>
                  {item.status === "unknown" ? <p className="nf-rdesk-note">{p.unknownNote}</p> : null}
                  {stuck ? (
                    <PayoutDecisionControl
                      payoutId={item.id}
                      mode="stuck"
                      who={who(item)}
                      amountLabel={money(item.amountMinor)}
                      last4={item.accountLast4}
                      canRelease={false}
                      copy={p}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
