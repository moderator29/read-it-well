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
import { ICON } from "@/components/app/Screen";

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
      <p className="mt-row nf-body-sm text-[var(--nf-content-muted)]">
        Nothing of theirs was live, so nothing came down.
      </p>
    );
  }

  return (
    <ul className="mt-row space-y-inline">
      {withdrawn.map((listing) => {
        // A listing that is no longer where the stop left it will not move when
        // the stop is lifted, and saying so here is the difference between an
        // operator expecting three listings back and getting two.
        const willReturn = listing.statusNow === "SUSPENDED";
        return (
          <li
            key={listing.id}
            className="flex flex-wrap items-baseline gap-x-xs gap-y-3xs border-t border-[var(--nf-divider)] pt-inline nf-body-sm"
          >
            <span className="min-w-0 flex-1 break-words text-[var(--nf-content-primary)]">
              {listing.title ?? "A listing that has since been deleted"}
            </span>
            <span className="nf-caption text-[var(--nf-content-muted)]">
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
    <details className="mt-heading">
      {/* The 44px floor on a disclosure an operator taps to open a case file. */}
      <summary className="flex min-h-11 cursor-pointer items-center nf-body-sm font-semibold text-[var(--nf-content-secondary)]">
        {records.length === 1 ? "One earlier stop" : `${records.length} earlier stops`}
      </summary>
      <ul className="mt-row space-y-row">
        {records.map((record) => (
          <li key={record.id} className="border-t border-[var(--nf-divider)] pt-row">
            <p className="nf-body-sm leading-relaxed text-[var(--nf-content-primary)]">
              {record.reason}
            </p>
            <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
              {signedBy(record)} on {dateLabel(record.suspendedAt)}. Lifted by{" "}
              {record.liftedByName ?? "an administrator"} on {dateLabel(record.liftedAt)}.{" "}
              {record.restoredCount === 0
                ? "Nothing was put back."
                : record.restoredCount === 1
                  ? "One listing was put back."
                  : `${record.restoredCount} listings were put back.`}
            </p>
            {record.liftNote && (
              <p className="mt-inline-tight nf-caption italic text-[var(--nf-content-secondary)]">
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
    <li className="nf-card p-card">
      <div className="flex flex-wrap items-center gap-xs">
        <span
          className="nf-badge shrink-0"
          style={{
            background: "var(--nf-status-rejected-surface)",
            color: "var(--nf-status-rejected)",
          }}
        >
          Stopped
        </span>
        <h3 className="nf-lede font-semibold text-[var(--nf-content-primary)]">
          {agent.displayName}
        </h3>
      </div>

      {stop ? (
        <>
          <p className="mt-heading nf-body leading-relaxed text-[var(--nf-content-primary)]">
            {stop.reason}
          </p>
          <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
            {signedBy(stop)} on {dateLabel(stop.suspendedAt)}.
          </p>

          {stop.staysAhead > 0 && (
            <p className="mt-row nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
              {stop.staysAhead === 1
                ? "One confirmed stay was still ahead when this landed. It was never cancelled and that guest keeps it."
                : `${stop.staysAhead} confirmed stays were still ahead when this landed. None were cancelled and those guests keep them.`}
            </p>
          )}

          {/* 0.6875rem, which is 11px, uppercase and tracked, on the heading
              over the list of a person's withdrawn inventory. `nf-overline` is
              the platform's own answer for a label above a section. */}
          <h4 className="mt-heading nf-overline text-[var(--nf-content-muted)]">
            What came down
          </h4>
          <WithdrawnList withdrawn={stop.withdrawn} lifted={false} />
        </>
      ) : (
        <p className="mt-heading nf-body-sm leading-relaxed text-[var(--nf-state-warning)]">
          This agent reads as stopped but nothing on the file explains why. Lifting will put them
          back to trading and record that there was nothing to restore.
        </p>
      )}

      <form action={action} className="mt-block">
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
          className="nf-btn nf-btn--primary nf-btn--sm mt-heading"
        >
          {pending ? "Letting them back" : "Let them back"}
        </button>
      </form>

      {mine && (
        <p role="status" className="mt-row nf-body-sm text-[var(--nf-status-approved)]">
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
    <li className="nf-card p-card">
      <div className="flex flex-wrap items-center gap-xs">
        <h3 className="min-w-0 flex-1 nf-body font-semibold text-[var(--nf-content-primary)]">
          {agent.displayName}
        </h3>
        <span className="nf-numeric nf-caption text-[var(--nf-content-muted)]">
          {agent.liveListingCount === 1 ? "1 live listing" : `${agent.liveListingCount} live listings`}
        </span>
      </div>

      {agent.pastStops.length > 0 && (
        <p className="mt-inline-tight nf-caption text-[var(--nf-content-muted)]">
          {agent.pastStops.length === 1
            ? "Stopped once before."
            : `Stopped ${agent.pastStops.length} times before.`}
        </p>
      )}

      {open ? (
        <form action={action} noValidate className="mt-heading">
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
              <span className="mt-inline block nf-body-sm text-[var(--nf-state-warning)]">
                {fieldError}
              </span>
            )}
          </label>

          <p className="mt-row nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
            {agent.liveListingCount === 0
              ? "Nothing of theirs is live, so nothing will come down."
              : agent.liveListingCount === 1
                ? "Their one live listing comes down and returns where it was if this is lifted."
                : `All ${agent.liveListingCount} of their live listings come down and return where they were if this is lifted.`}{" "}
            Confirmed stays are never cancelled.
          </p>

          <div className="mt-heading flex flex-wrap gap-xs">
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
          className="nf-btn nf-btn--ghost nf-btn--sm mt-heading"
        >
          Stop this agent
        </button>
      )}

      {mine && (
        <p role="status" className="mt-row nf-body-sm text-[var(--nf-status-approved)]">
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
    <div className="space-y-section-tight">
      <section aria-label="Stopped">
        <h2 className="nf-h4 text-[var(--nf-content-primary)]">
          Stopped {stopped.length > 0 && <span className="nf-numeric">({stopped.length})</span>}
        </h2>

        {stopped.length === 0 ? (
          /* An empty state draws no container anywhere else in the product, and
             the message here is that there is nothing to see. */
          <div className="mt-heading p-card text-center">
            <span
              className="mx-auto grid h-12 w-12 place-items-center rounded-full"
              style={{
                background: "var(--nf-status-approved-surface)",
                color: "var(--nf-status-approved)",
              }}
            >
              <UiIcon name="verified" size={ICON.row} />
            </span>
            <p className="mt-heading nf-body font-semibold text-[var(--nf-content-primary)]">
              Nobody is stopped
            </p>
            <p className="mx-auto mt-row max-w-[44ch] nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
              Every agent on the platform is trading. A stop taken here comes with a reason the
              agent reads, and it can always be lifted.
            </p>
          </div>
        ) : (
          <ul className="mt-heading space-y-row">
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
          <p role="alert" className="mt-row nf-body-sm text-[var(--nf-state-warning)]">
            {liftState.error}
          </p>
        )}
      </section>

      <section aria-label="Trading">
        <div className="flex flex-wrap items-baseline justify-between gap-row">
          <h2 className="nf-h4 text-[var(--nf-content-primary)]">
            Trading <span className="nf-numeric">({trading.length})</span>
          </h2>
        </div>
        <p className="mt-row max-w-[62ch] nf-body-sm leading-relaxed text-[var(--nf-content-muted)]">
          Every approved agent. A stop takes down everything of theirs that is live and tells them
          why, in your words.
        </p>

        <label className="mt-heading block">
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
          <p className="mt-heading nf-body-sm text-[var(--nf-content-muted)]">
            {trading.length === 0
              ? "No agent is approved yet, so there is nobody who could be stopped."
              : `No agent's name matches "${search.trim()}". Clear the box to see all ${trading.length}.`}
          </p>
        ) : (
          <ul className="mt-heading space-y-row">
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
          <p role="alert" className="mt-row nf-body-sm text-[var(--nf-state-warning)]">
            {stopState.error}
          </p>
        )}
      </section>
    </div>
  );
}
