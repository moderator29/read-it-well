"use client";

import { useActionState, useState } from "react";
import {
  liftAgentStop,
  stopAgentTrading,
  type LiftReceipt,
  type StopReceipt,
} from "@/lib/admin/suspension-actions";
import type { AgentStanding, StopRecord } from "@/lib/admin/suspension-queries";
import type { ActionResult } from "@/lib/actions/envelope";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * The stops desk.
 *
 * Stopping an agent is the heaviest thing this console does to somebody who has
 * done nothing criminal, so the whole design is about making the cost visible
 * before the decision rather than after it. The stop form says how many
 * listings will come down. The stopped card says exactly which ones came down
 * and where each will land if the stop is lifted. Nobody should ever press
 * either button and then find out what it did.
 *
 * The reason is required and it is long, because the agent reads it. It arrives
 * in their notifications word for word, and it is the whole basis on which they
 * can answer. A reason nobody could act on is not a reason.
 *
 * Confirmed stays are never cancelled by a stop, and the count is printed on
 * the card so an operator can see who is still owed a room.
 */

function statusWord(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

function dateLabel(iso: string | null): string {
  if (!iso) return "not recorded";
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return "not recorded";
  return new Date(parsed).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Who signed a stop, distinguishing "nobody" from "somebody who has left". */
function signedBy(record: StopRecord): string {
  if (record.suspendedByName) return `Stopped by ${record.suspendedByName}`;
  if (record.suspendedBySignerGone) {
    return "Stopped by an administrator whose account has since been closed";
  }
  return "Stopped by an administrator";
}

function WithdrawnList({
  withdrawn,
  lifted,
}: {
  withdrawn: StopRecord["withdrawn"];
  lifted: boolean;
}) {
  if (withdrawn.length === 0) {
    return (
      <p className="mt-2 text-[0.8125rem] text-[var(--nf-content-muted)]">
        Nothing of theirs was live, so nothing came down.
      </p>
    );
  }

  return (
    <ul className="mt-2 space-y-1.5">
      {withdrawn.map((listing) => {
        // A listing that is no longer where the stop left it will not move when
        // the stop is lifted, and saying so here is the difference between an
        // operator expecting three listings back and getting two.
        const willReturn = listing.statusNow === "SUSPENDED";
        return (
          <li
            key={listing.id}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-[var(--nf-border-subtle)] pt-1.5 text-[0.8125rem]"
          >
            <span className="min-w-0 flex-1 break-words text-[var(--nf-content-primary)]">
              {listing.title ?? "A listing that has since been deleted"}
            </span>
            <span className="text-[0.75rem] text-[var(--nf-content-muted)]">
              {lifted
                ? `was ${statusWord(listing.from).toLowerCase()}`
                : willReturn
                  ? `returns to ${statusWord(listing.from).toLowerCase()}`
                  : listing.statusNow
                    ? `now ${statusWord(listing.statusNow).toLowerCase()}, stays as it is`
                    : "deleted since, stays as it is"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StopHistory({ records }: { records: StopRecord[] }) {
  if (records.length === 0) return null;

  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[0.8125rem] font-semibold text-[var(--nf-content-secondary)]">
        {records.length === 1 ? "One earlier stop" : `${records.length} earlier stops`}
      </summary>
      <ul className="mt-2 space-y-3">
        {records.map((record) => (
          <li key={record.id} className="border-t border-[var(--nf-border-subtle)] pt-2.5">
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-primary)]">
              {record.reason}
            </p>
            <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
              {signedBy(record)} on {dateLabel(record.suspendedAt)}. Lifted by{" "}
              {record.liftedByName ?? "an administrator"} on {dateLabel(record.liftedAt)}.{" "}
              {record.restoredCount === 0
                ? "Nothing was put back."
                : record.restoredCount === 1
                  ? "One listing was put back."
                  : `${record.restoredCount} listings were put back.`}
            </p>
            {record.liftNote && (
              <p className="mt-1 text-[0.75rem] italic text-[var(--nf-content-secondary)]">
                {record.liftNote}
              </p>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function StoppedCard({
  agent,
  action,
  state,
  pending,
}: {
  agent: AgentStanding;
  action: (formData: FormData) => void;
  state: ActionResult<LiftReceipt> | null;
  pending: boolean;
}) {
  const stop = agent.openStop;
  const mine = state && state.ok && state.data.agentId === agent.agentId;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="nf-badge shrink-0"
          style={{
            background: "var(--nf-status-rejected-surface)",
            color: "var(--nf-status-rejected)",
          }}
        >
          Stopped
        </span>
        <h3 className="text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
          {agent.displayName}
        </h3>
      </div>

      {stop ? (
        <>
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--nf-content-primary)]">
            {stop.reason}
          </p>
          <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
            {signedBy(stop)} on {dateLabel(stop.suspendedAt)}.
          </p>

          {stop.staysAhead > 0 && (
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
              {stop.staysAhead === 1
                ? "One confirmed stay was still ahead when this landed. It was never cancelled and that guest keeps it."
                : `${stop.staysAhead} confirmed stays were still ahead when this landed. None were cancelled and those guests keep them.`}
            </p>
          )}

          <h4 className="mt-3 text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--nf-content-muted)]">
            What came down
          </h4>
          <WithdrawnList withdrawn={stop.withdrawn} lifted={false} />
        </>
      ) : (
        <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--nf-state-warning)]">
          This agent reads as stopped but nothing on the file explains why. Lifting will put them
          back to trading and record that there was nothing to restore.
        </p>
      )}

      <form action={action} className="mt-4">
        <input type="hidden" name="agentId" value={agent.agentId} />
        <label className="block">
          <span className="nf-label">Note for the record</span>
          <textarea
            name="note"
            rows={2}
            placeholder="What changed. Optional, and kept on the file."
            className="nf-field"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="nf-btn nf-btn--primary nf-btn--sm mt-2.5"
        >
          {pending ? "Letting them back" : "Let them back"}
        </button>
      </form>

      {mine && (
        <p role="status" className="mt-2 text-[0.8125rem] text-[var(--nf-status-approved)]">
          {state.data.displayName} is trading again.{" "}
          {state.data.restoredCount === 0
            ? "Nothing needed putting back."
            : state.data.restoredCount === 1
              ? "One listing is back where it was."
              : `${state.data.restoredCount} listings are back where they were.`}
          {state.data.restoredCount < state.data.withdrawnCount &&
            ` ${state.data.withdrawnCount - state.data.restoredCount} had moved since and were left alone.`}
        </p>
      )}

      <StopHistory records={agent.pastStops} />
    </li>
  );
}

function TradingCard({
  agent,
  action,
  state,
  pending,
}: {
  agent: AgentStanding;
  action: (formData: FormData) => void;
  state: ActionResult<StopReceipt> | null;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const mine = state && state.ok && state.data.agentId === agent.agentId;
  const fieldError =
    state && !state.ok && open ? (state.fieldErrors?.reason ?? undefined) : undefined;

  return (
    <li className="nf-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
          {agent.displayName}
        </h3>
        <span className="nf-numeric text-[0.75rem] text-[var(--nf-content-muted)]">
          {agent.liveListingCount === 1 ? "1 live listing" : `${agent.liveListingCount} live listings`}
        </span>
      </div>

      {agent.pastStops.length > 0 && (
        <p className="mt-1 text-[0.75rem] text-[var(--nf-content-muted)]">
          {agent.pastStops.length === 1
            ? "Stopped once before."
            : `Stopped ${agent.pastStops.length} times before.`}
        </p>
      )}

      {open ? (
        <form action={action} noValidate className="mt-3">
          <input type="hidden" name="agentId" value={agent.agentId} />
          <label className="block">
            <span className="nf-label">Why they are being stopped</span>
            <textarea
              name="reason"
              rows={3}
              autoFocus
              aria-invalid={fieldError ? true : undefined}
              placeholder="The agent reads this word for word. Say what happened and what would put it right."
              className="nf-field"
            />
            {fieldError && (
              <span className="mt-1.5 block text-[0.78rem] text-[var(--nf-state-warning)]">
                {fieldError}
              </span>
            )}
          </label>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {agent.liveListingCount === 0
              ? "Nothing of theirs is live, so nothing will come down."
              : agent.liveListingCount === 1
                ? "Their one live listing comes down and returns where it was if this is lifted."
                : `All ${agent.liveListingCount} of their live listings come down and return where they were if this is lifted.`}{" "}
            Confirmed stays are never cancelled.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="nf-btn nf-btn--primary nf-btn--sm"
            >
              {pending ? "Stopping" : "Stop them trading"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="nf-btn nf-btn--ghost nf-btn--sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="nf-btn nf-btn--ghost nf-btn--sm mt-3"
        >
          Stop this agent
        </button>
      )}

      {mine && (
        <p role="status" className="mt-2 text-[0.8125rem] text-[var(--nf-status-approved)]">
          {state.data.displayName} has been stopped and told why.{" "}
          {state.data.withdrawnCount === 0
            ? "Nothing was live."
            : state.data.withdrawnCount === 1
              ? "One listing came down."
              : `${state.data.withdrawnCount} listings came down.`}
          {state.data.staysAhead > 0 &&
            ` ${state.data.staysAhead === 1 ? "One confirmed stay is" : `${state.data.staysAhead} confirmed stays are`} untouched.`}
        </p>
      )}

      <StopHistory records={agent.pastStops} />
    </li>
  );
}

export function StopsDesk({
  stopped,
  trading,
}: {
  stopped: AgentStanding[];
  trading: AgentStanding[];
}) {
  const [stopState, stopAction, stopPending] = useActionState<
    ActionResult<StopReceipt> | null,
    FormData
  >(stopAgentTrading, null);
  const [liftState, liftAction, liftPending] = useActionState<
    ActionResult<LiftReceipt> | null,
    FormData
  >(liftAgentStop, null);

  const [search, setSearch] = useState("");
  const needle = search.trim().toLowerCase();
  const shown = needle
    ? trading.filter((a) => a.displayName.toLowerCase().includes(needle))
    : trading;

  return (
    <div className="space-y-6">
      <section aria-label="Stopped">
        <h2 className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">
          Stopped {stopped.length > 0 && <span className="nf-numeric">({stopped.length})</span>}
        </h2>

        {stopped.length === 0 ? (
          <div className="nf-card mt-2 p-6 text-center">
            <span
              className="mx-auto grid h-12 w-12 place-items-center rounded-full"
              style={{
                background: "var(--nf-status-approved-surface)",
                color: "var(--nf-status-approved)",
              }}
            >
              <UiIcon name="verified" size={24} />
            </span>
            <p className="mt-3 text-[1rem] font-semibold text-[var(--nf-content-primary)]">
              Nobody is stopped
            </p>
            <p className="mx-auto mt-1.5 max-w-[44ch] text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              Every agent on the platform is trading. A stop taken here comes with a reason the
              agent reads, and it can always be lifted.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-3">
            {stopped.map((agent) => (
              <StoppedCard
                key={agent.agentId}
                agent={agent}
                action={liftAction}
                state={liftState}
                pending={liftPending}
              />
            ))}
          </ul>
        )}

        {liftState && !liftState.ok && (
          <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-warning)]">
            {liftState.error}
          </p>
        )}
      </section>

      <section aria-label="Trading">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[0.9375rem] font-bold text-[var(--nf-content-primary)]">
            Trading <span className="nf-numeric">({trading.length})</span>
          </h2>
        </div>
        <p className="mt-1 max-w-[62ch] text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          Every approved agent. A stop takes down everything of theirs that is live and tells them
          why, in your words.
        </p>

        <label className="mt-3 block">
          <span className="sr-only">Find an agent by name</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find an agent by name"
            className="nf-field"
          />
        </label>

        {shown.length === 0 ? (
          <p className="mt-3 text-[0.875rem] text-[var(--nf-content-muted)]">
            {trading.length === 0
              ? "No agent is approved yet, so there is nobody who could be stopped."
              : `No agent's name matches "${search.trim()}". Clear the box to see all ${trading.length}.`}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {shown.map((agent) => (
              <TradingCard
                key={agent.agentId}
                agent={agent}
                action={stopAction}
                state={stopState}
                pending={stopPending}
              />
            ))}
          </ul>
        )}

        {stopState && !stopState.ok && !stopState.fieldErrors?.reason && (
          <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-warning)]">
            {stopState.error}
          </p>
        )}
      </section>
    </div>
  );
}
