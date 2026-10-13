"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { PendingRing } from "@/components/ui/PendingRing";
import { nearMeHref } from "./quick-chips";
import type { ShelfQuery } from "./shelf-query";

/**
 * "Near me": the device's position, then the map view there with the search
 * kept (`quick-chips.ts`). Asked for only on the tap, never on arrival, and
 * every branch ends in words: a control that spins for ever is a lie, so the
 * wait has a ceiling, and a refusal says how to turn location back on. The
 * words are drawn by the chip row under itself (`ShelfChipRow`), outside the
 * row's scroller, where they cannot be clipped.
 */
export function NearMeChip({
  query,
  copy,
  onMessage,
}: {
  query: ShelfQuery;
  copy: { nearMe: string; locating: string; denied: string; failed: string; unavailable: string };
  /** The words for a refusal or a failure, or null once there is nothing to say. */
  onMessage: (message: string | null) => void;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  function stopWaiting() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setWorking(false);
  }

  function locate() {
    if (working) return;
    const geolocation = typeof navigator === "undefined" ? undefined : navigator.geolocation;
    if (!geolocation) {
      onMessage(copy.unavailable);
      return;
    }
    onMessage(null);
    setWorking(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setWorking(false);
      onMessage(copy.failed);
    }, 11_000);
    geolocation.getCurrentPosition(
      (position) => {
        if (timer.current === null) return;
        stopWaiting();
        router.push(nearMeHref(query, { lat: position.coords.latitude, lng: position.coords.longitude }));
      },
      (error) => {
        if (timer.current === null) return;
        stopWaiting();
        onMessage(error.code === error.PERMISSION_DENIED ? copy.denied : copy.failed);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
  }

  return (
    <button
      type="button"
      data-testid="quick-near-me"
      aria-busy={working || undefined}
      onClick={locate}
      className="nf-shelf-chip nf-shelf-chip--quick"
    >
      {working ? <PendingRing size={16} /> : <UiIcon name="location" size={16} />}
      {working ? copy.locating : copy.nearMe}
    </button>
  );
}
