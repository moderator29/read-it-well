"use client";

import { useCallback, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * How long it takes to get to this restaurant from where the reader is.
 *
 * A client component because the origin belongs to the browser and nothing else
 * knows it. The server cannot render this, and pre-rendering a guess is exactly
 * what the whole feature exists to avoid.
 *
 * ## It asks before it asks
 *
 * The control does nothing until it is pressed, and that is a deliberate
 * refusal rather than a missing feature. Requesting a position on mount would
 * put a browser permission prompt in front of somebody who came to look at a
 * menu, and a page that demands your location before showing you dinner is one
 * people leave. Pressing the button is the consent.
 *
 * ## Every failure ends in the same place
 *
 * Permission refused, no GPS fix, the API not enabled, no drivable route: all
 * of them hide the control. There is deliberately no error state, because there
 * is nothing a reader can usefully do about any of them and a red message where
 * a travel time should be is worse than no travel time. The address and the map
 * are still on the page, which is what somebody actually needs.
 *
 * The one thing it will not do is spin for ever. `getCurrentPosition` can hang
 * silently when a device has no fix, so the wait is bounded twice: the browser
 * gets a `timeout`, and a `setTimeout` covers the case where even that does not
 * fire. A control that spins for ever is a lie, which is the same rule the map
 * already follows.
 */

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "answered"; duration: string; distance: string }
  /* Gone for the rest of the visit. Retrying costs a billed request and, when
     the reason was a refused permission, re-prompts somebody who already said
     no once. */
  | { phase: "gone" };

const FIX_TIMEOUT_MS = 10_000;
/** The outer bound, for a browser that never calls either callback. */
const HARD_TIMEOUT_MS = 12_000;

export function TravelTime({
  listingId,
  label,
  workingLabel,
}: {
  listingId: string;
  /** `common.travelTime`. */
  label: string;
  /** `common.loading`. */
  workingLabel: string;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });

  const ask = useCallback(() => {
    if (state.phase !== "idle") return;

    const geolocation =
      typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geolocation) {
      setState({ phase: "gone" });
      return;
    }

    setState({ phase: "working" });

    let settled = false;
    const give = (next: State) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(hardTimer);
      setState(next);
    };
    const hardTimer = window.setTimeout(() => give({ phase: "gone" }), HARD_TIMEOUT_MS);

    geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch("/api/travel-time", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              listingId,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          });
          if (!response.ok) {
            give({ phase: "gone" });
            return;
          }
          const body: unknown = await response.json();
          const answer = body as { outcome?: string; duration?: string; distance?: string };
          if (answer.outcome !== "ok" || !answer.duration || !answer.distance) {
            give({ phase: "gone" });
            return;
          }
          give({ phase: "answered", duration: answer.duration, distance: answer.distance });
        } catch {
          give({ phase: "gone" });
        }
      },
      // Refused, unavailable or timed out. All the same to a reader.
      () => give({ phase: "gone" }),
      { enableHighAccuracy: false, timeout: FIX_TIMEOUT_MS, maximumAge: 300_000 },
    );
  }, [listingId, state.phase]);

  if (state.phase === "gone") return null;

  if (state.phase === "answered") {
    return (
      <p className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)]">
        <UiIcon name="compass" size={16} className="shrink-0 opacity-70" aria-hidden />
        <span>
          {/* Numbers and units only. The duration is already rounded to five
              minutes by the server, so nothing here can claim a precision a
              traffic estimate does not have. */}
          <strong className="font-semibold text-[var(--nf-content-primary)]">
            {state.duration}
          </strong>
          <span aria-hidden> · </span>
          <span className="opacity-80">{state.distance}</span>
        </span>
      </p>
    );
  }

  const working = state.phase === "working";
  return (
    <button
      type="button"
      onClick={ask}
      disabled={working}
      aria-busy={working}
      className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--nf-radius-control)] border border-[var(--nf-border-subtle)] px-3 py-1.5 text-[0.8125rem] text-[var(--nf-content-secondary)] transition-opacity hover:opacity-80 disabled:opacity-60"
    >
      <UiIcon name="compass" size={16} className="shrink-0 opacity-70" aria-hidden />
      {working ? workingLabel : label}
    </button>
  );
}
