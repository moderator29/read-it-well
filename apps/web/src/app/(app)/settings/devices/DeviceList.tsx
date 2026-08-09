"use client";

import { useState, useTransition } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { endOtherSessions, endSession } from "@/lib/security/sessions-actions";

/**
 * The list, and the two buttons that end things.
 *
 * A client component for one reason: both actions are destructive and neither
 * may fire on a single tap. Everything else, including every string on the
 * screen, is decided by the server component above, so this holds no copy of
 * the session data. The actions call `revalidatePath` and the page re-renders
 * from the database, which is what keeps the screen from ever claiming a device
 * is still signed in after it was thrown off.
 *
 * ## Confirm-then-act, and why it is per row
 *
 * `armed` holds the id of the one row, or the word "others", that is currently
 * one tap from firing. A single piece of state rather than a flag per row means
 * arming a second control disarms the first by construction, so a person who
 * changes their mind and taps a different row cannot end the wrong session with
 * the tap that was meant to select it.
 *
 * This is `DataCard`'s tap-again pattern rather than a modal, and the choice is
 * the same one that file made: a sheet over a list of sessions puts a dialog
 * between somebody and the thing they are trying to read while deciding.
 */

export type DeviceRow = {
  id: string;
  isCurrent: boolean;
  /** Already assembled from a fixed list of names. Never a raw User-Agent. */
  device: string;
  /** Only present when the device genuinely was not recorded. */
  deviceNote?: string;
  thisDevice: string;
  signedIn: string;
  lastSeen: string;
};

export type DeviceListCopy = {
  intro: string;
  caveat: string;
  endThis: string;
  endCurrent: string;
  endOthers: string;
  endOthersSub: string;
  endOthersNone: string;
  confirm: string;
  working: string;
  endedOne: string;
  endedOthers: string;
  endedNone: string;
  unreadable: string;
};

type Outcome = { tone: "done" | "problem"; message: string } | null;

export function DeviceList({
  rows,
  readable,
  copy,
}: {
  rows: DeviceRow[];
  /** False when the read itself failed. Not the same as an empty list. */
  readable: boolean;
  copy: DeviceListCopy;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [pending, startTransition] = useTransition();

  const others = rows.filter((row) => !row.isCurrent).length;

  const run = (key: string, work: () => Promise<Outcome>) => {
    if (armed !== key) {
      setArmed(key);
      setOutcome(null);
      return;
    }
    setArmed(null);
    startTransition(async () => {
      setOutcome(await work());
    });
  };

  const endOne = (row: DeviceRow) =>
    run(row.id, async () => {
      const result = await endSession({ sessionId: row.id });
      if (!result.ok) return { tone: "problem", message: result.error };
      /*
       * Ending the session you are reading from is allowed, because sometimes
       * it is the right thing: a shared machine, a browser you want off the
       * account. The page is reloaded rather than routed, so the middleware
       * runs against cookies whose refresh token no longer resolves and sends
       * this browser to sign in. Routing would leave a signed-out person
       * looking at a rendered account screen until they navigated.
       */
      if (result.data.wasCurrent) {
        window.location.assign("/sign-in?notice=sign-in-required");
        return null;
      }
      return { tone: "done", message: copy.endedOne };
    });

  const endRest = () =>
    run("others", async () => {
      const result = await endOtherSessions();
      if (!result.ok) return { tone: "problem", message: result.error };
      /* Zero is reported as zero. "Signed out everywhere else" over a list that
         had nothing else on it is the screen claiming work it did not do. */
      return {
        tone: "done",
        message: result.data.ended === 0 ? copy.endedNone : copy.endedOthers,
      };
    });

  return (
    <div className="space-y-block">
      <p className="nf-body-sm text-content-2">{copy.intro}</p>

      {!readable && (
        <p role="alert" className="nf-card p-card nf-body-sm text-content">
          {copy.unreadable}
        </p>
      )}

      {outcome && (
        <p
          role="status"
          data-testid="devices-outcome"
          className={`nf-card p-card nf-body-sm ${
            outcome.tone === "problem" ? "text-danger" : "text-content"
          }`}
        >
          {outcome.message}
        </p>
      )}

      <ul className="space-y-row">
        {rows.map((row) => (
          <li key={row.id} className="nf-card p-card" data-testid="device-row">
            <div className="flex items-start justify-between gap-inline">
              <div>
                <p className="nf-body font-semibold text-content">{row.device}</p>
                {row.deviceNote && (
                  <p className="nf-caption mt-row text-muted">{row.deviceNote}</p>
                )}
              </div>
              {row.isCurrent && (
                <span className="nf-caption shrink-0 text-brand" data-testid="device-current">
                  {row.thisDevice}
                </span>
              )}
            </div>

            <dl className="mt-row space-y-row">
              {row.signedIn && (
                <div className="flex items-center gap-inline-tight">
                  <UiIcon name="key" size="xs" />
                  <dd className="nf-body-sm text-content-2">{row.signedIn}</dd>
                </div>
              )}
              {row.lastSeen && (
                <div className="flex items-center gap-inline-tight">
                  <UiIcon name="history" size="xs" />
                  <dd className="nf-body-sm text-content-2">{row.lastSeen}</dd>
                </div>
              )}
            </dl>

            <button
              type="button"
              onClick={() => endOne(row)}
              disabled={pending}
              data-testid="device-end"
              className={`nf-btn nf-btn--sm mt-group w-full ${
                armed === row.id ? "nf-btn--danger" : "nf-btn--ghost"
              }`}
            >
              {pending && armed === null
                ? copy.working
                : armed === row.id
                  ? copy.confirm
                  : row.isCurrent
                    ? copy.endCurrent
                    : copy.endThis}
            </button>
          </li>
        ))}
      </ul>

      <div className="nf-card p-card">
        <p className="nf-body font-semibold text-content">{copy.endOthers}</p>
        <p className="nf-body-sm mt-row text-content-2">
          {others === 0 ? copy.endOthersNone : copy.endOthersSub}
        </p>
        <button
          type="button"
          onClick={endRest}
          disabled={pending || others === 0}
          data-testid="devices-end-others"
          className={`nf-btn nf-btn--sm mt-group w-full ${
            armed === "others" ? "nf-btn--danger" : "nf-btn--ghost"
          }`}
        >
          {armed === "others" ? copy.confirm : copy.endOthers}
        </button>
      </div>

      {/* The honest line, under the buttons rather than over them, because it
          is what somebody needs after they have acted rather than a warning
          that makes them hesitate before doing the right thing. */}
      <p className="nf-caption text-muted">{copy.caveat}</p>
    </div>
  );
}
