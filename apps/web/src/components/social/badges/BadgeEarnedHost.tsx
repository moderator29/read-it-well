"use client";

import { useEffect, useState } from "react";
import { BadgeMoment, type BadgeMomentCopy } from "./BadgeMoment";
import { badgeToCelebrate, quietlySeen, type ProfileBadge } from "./badge-model";

const KEY = "nf_badges_shown";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(codes: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(codes.slice(-64)));
  } catch {
    /* Storage can be blocked. The worst case is the moment shows again. */
  }
}

/**
 * THE MOMENT, AT THE TIME IT IS EARNED (motion 22).
 *
 * Mounted on the owner's own profile only. It shows the earned moment once for
 * the newest earned badge this device has not yet shown, and only while the
 * badge is recent (`badgeToCelebrate`): somebody whose badge was awarded a
 * year ago is not congratulated for it today, and an older earned badge is
 * simply remembered so it never plays by accident. A hand-given badge is never
 * shown here; the model refuses it.
 *
 * "Shown" is kept on this device (a per-viewer convenience): the server has no
 * notion of a badge having been seen, and inventing one is Session 2's. The
 * worst case of a cleared store is that a recent badge plays once more, which
 * is a true celebration of a true thing.
 *
 * It waits a beat after the page has painted so it arrives over a settled
 * screen rather than competing with the hero's own entrance.
 */
export function BadgeEarnedHost({
  badges,
  copy,
  shareUrl,
}: {
  badges: readonly ProfileBadge[];
  copy: BadgeMomentCopy;
  shareUrl?: string;
}) {
  const [current, setCurrent] = useState<ProfileBadge | null>(null);

  useEffect(() => {
    const now = Date.now();
    const seen = readSeen();
    const old = quietlySeen(badges, seen, now);
    if (old.length > 0) writeSeen([...seen, ...old]);
    const next = badgeToCelebrate(badges, seen, now);
    if (!next) return;
    const timer = window.setTimeout(() => setCurrent(next), 600);
    return () => window.clearTimeout(timer);
  }, [badges]);

  if (!current) return null;
  return (
    <BadgeMoment
      badge={current}
      copy={copy}
      shareUrl={shareUrl}
      onClose={() => {
        writeSeen([...readSeen(), current.code]);
        setCurrent(null);
      }}
    />
  );
}
