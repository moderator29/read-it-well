import { formatDate, formatNumber, type Locale } from "@vallo/i18n/core";
import { tx } from "@/app/admin/_components/shell-text";
import { MeterBar } from "@/components/agent/charts/MeterBar";
import {
  PUSH_DELIVERY_STATES,
  PUSH_OUTCOMES,
  PUSH_QUEUE_STATES,
  type PushActivity,
  type PushDeliveryRow,
  type PushDeliveryState,
  type PushOutcome,
  type PushQueueState,
} from "@/lib/admin/reads/shapes";
import { Badge, CalmNote, NotWired, Panel, PanelUnavailable, type BadgeTone } from "../_components/panels";

/**
 * Operations > Notifications, the push half (third closing audit):
 * `push_queue` and `push_deliveries` through `getPushActivity`. The in-app
 * notifications table stays behind Request A6 and the email outbox behind
 * Request A14; both panels say so.
 */
type Word = { word: string; tone: BadgeTone; means: string };

const QUEUE: Record<PushQueueState, Word> = {
  pending: { word: "Waiting", tone: "pending", means: "for the next drain" },
  held: { word: "Held", tone: "pending", means: "inside the person's quiet hours" },
  sending: { word: "Sending", tone: "info", means: "claimed by a drain" },
  failed: { word: "Retrying", tone: "error", means: "the last attempt failed" },
  dead: { word: "Out of attempts", tone: "error", means: "kept for the record" },
  done: { word: "Done", tone: "success", means: "settled; the outcome says how" },
};

const OUTCOME: Record<PushOutcome, Word> = {
  delivered: { word: "Delivered", tone: "success", means: "at least one device took it" },
  suppressed_preference: { word: "Push off", tone: "info", means: "the person turned push off for this kind" },
  suppressed_no_device: { word: "No device", tone: "info", means: "every device was retired first" },
  suppressed_expired: { word: "Expired", tone: "pending", means: "too old to be worth sending" },
  collapsed: { word: "Summarised", tone: "info", means: "folded into a summary after quiet hours" },
  gave_up: { word: "Gave up", tone: "error", means: "every device failed, attempts ran out" },
};

const DELIVERY: Record<PushDeliveryState, Word> = {
  sending: { word: "No reply yet", tone: "pending", means: "posted, the provider's answer not read" },
  sent: { word: "Sent", tone: "success", means: "the provider accepted it" },
  failed: { word: "Failed", tone: "error", means: "the provider refused; retryable" },
  gone: { word: "Device gone", tone: "error", means: "the token was retired" },
};

function Dist<K extends string>({
  keys,
  counts,
  words,
  label,
  locale,
}: {
  keys: readonly K[];
  counts: Record<K, number>;
  words: Record<K, Word>;
  label: string;
  locale: Locale;
}) {
  const total = keys.reduce((sum, k) => sum + counts[k], 0);
  const max = Math.max(0, ...keys.map((k) => counts[k]));
  return (
    <div className="nf-admin-dist" role="table" aria-label={label}>
      <div className="nf-admin-dist__row nf-admin-dist__row--head" role="row">
        <span role="columnheader">{tx(locale, "opsPushState")}</span>
        <span role="columnheader" className="nf-admin-dist__num">{tx(locale, "opsPushCount")}</span>
        <span role="columnheader" className="nf-admin-dist__num">%</span>
        <span role="columnheader" className="sr-only">Share</span>
      </div>
      {keys.map((k, i) => (
        <div key={k} className="nf-admin-dist__row" role="row">
          <span className="nf-admin-dist__name" role="cell">
            <Badge tone={words[k].tone}>{words[k].word}</Badge>
            <span className="nf-admin-dt__sub">{words[k].means}</span>
          </span>
          <span className="nf-admin-dist__num nf-numeric" role="cell">{formatNumber(counts[k], locale)}</span>
          <span className="nf-admin-dist__num nf-numeric" role="cell">{total > 0 ? `${Math.round((counts[k] / total) * 100)}%` : "0%"}</span>
          <span role="cell">
            <MeterBar value={counts[k]} max={max} rank={i} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Attempts({ rows, locale }: { rows: PushDeliveryRow[]; locale: Locale }) {
  return (
    <ul className="nf-admin-kinds">
      {rows.map((row) => (
        <li key={row.id}>
          <span>
            {row.platform === "ios" ? "iOS" : row.platform === "android" ? "Android" : "Web"}
            {row.providerStatus !== null ? ` · ${tx(locale, "opsPushProvider")} ${row.providerStatus}` : ""}
            <span className="nf-admin-dt__sub">
              {formatDate(new Date(row.attemptedAt), locale, { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {row.error ? ` · ${row.error}` : ""}
            </span>
          </span>
          <Badge tone={DELIVERY[row.state].tone}>{DELIVERY[row.state].word}</Badge>
        </li>
      ))}
    </ul>
  );
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export function PushActivityPanels({ push, locale }: { push: PushActivity | null; locale: Locale }) {
  const days = String(push?.windowDays ?? 7);
  const unavailable = <PanelUnavailable what={tx(locale, "opsPushQueueNow")} locale={locale} />;
  return (
    <>
      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="ops-push-queue" title={tx(locale, "opsPushQueueNow")}>
          {!push ? unavailable : (
            <>
              <Dist keys={PUSH_QUEUE_STATES} counts={push.queue} words={QUEUE} label={tx(locale, "opsPushQueueNow")} locale={locale} />
              {sum(push.queue) === 0 && (
                <div className="nf-admin-dist__note">
                  <CalmNote title={tx(locale, "opsPushNoQueueTitle")} fills={tx(locale, "opsPushNoQueueFills")} creates={tx(locale, "opsPushNoQueueCreates")} />
                </div>
              )}
            </>
          )}
        </Panel>
        <Panel id="ops-push-outcomes" title={tx(locale, "opsPushOutcomes").replace("{days}", days)}>
          {!push ? unavailable : (
            <>
              <Dist keys={PUSH_OUTCOMES} counts={push.outcomes} words={OUTCOME} label={tx(locale, "opsPushOutcome")} locale={locale} />
              {sum(push.outcomes) === 0 && (
                <div className="nf-admin-dist__note">
                  <CalmNote title={tx(locale, "opsPushNoOutcomesTitle")} fills={tx(locale, "opsPushNoOutcomesFills")} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
      <div className="nf-admin-grid nf-admin-grid--halves">
        <Panel id="ops-push-deliveries" title={tx(locale, "opsPushDeliveries").replace("{days}", days)}>
          {!push ? unavailable : (
            <>
              <Dist keys={PUSH_DELIVERY_STATES} counts={push.deliveries} words={DELIVERY} label={tx(locale, "opsPushDevice")} locale={locale} />
              {push.recent.length > 0 ? (
                <>
                  <h3 className="nf-admin-subhead">{tx(locale, "opsPushRecent")}</h3>
                  <Attempts rows={push.recent} locale={locale} />
                </>
              ) : (
                <div className="nf-admin-dist__note">
                  <CalmNote title={tx(locale, "opsPushNoDeliveriesTitle")} fills={tx(locale, "opsPushNoDeliveriesFills")} />
                </div>
              )}
            </>
          )}
        </Panel>
        <Panel id="ops-push-failures" title={tx(locale, "opsPushFailures")}>
          {!push ? unavailable : push.failures.length === 0 ? (
            <CalmNote kind="clear" title={tx(locale, "opsPushNoFailuresTitle")} fills={tx(locale, "opsPushNoFailuresFills")} />
          ) : (
            <Attempts rows={push.failures} locale={locale} />
          )}
        </Panel>
      </div>
    </>
  );
}

export function EmailOutboxPanel({ locale }: { locale: Locale }) {
  return (
    <Panel id="ops-email-outbox" title={tx(locale, "opsEmailOutbox")}>
      <NotWired title={tx(locale, "opsNotReadableByAnAdmin")} what={tx(locale, "opsEmailOutboxWhat")} request={tx(locale, "opsEmailOutboxRequest")} />
    </Panel>
  );
}
