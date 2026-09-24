"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@vallo/i18n";
import { draftSavedSearchMatches } from "@/lib/saved/draft-matches";

/**
 * V-10: on the wizard's last step, how many people's saved searches this
 * draft would match today (distinct people, only at three or more). Drawn
 * only once the draft exists. States: checking, a count, fewer than three,
 * could not check.
 */

type Copy = Dictionary["frontDoor"]["demand"];
type Result = { id: string; people: number | null } | { id: string; failed: true };

export function DraftMatches({ listingId, copy }: { listingId: string; copy: Copy }) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let live = true;
    draftSavedSearchMatches({ listingId })
      .then((r) => {
        if (live) setResult(r.ok ? { id: listingId, people: r.data.people } : { id: listingId, failed: true });
      })
      .catch(() => {
        if (live) setResult({ id: listingId, failed: true });
      });
    return () => {
      live = false;
    };
  }, [listingId]);

  const current = result && result.id === listingId ? result : null;
  const text =
    current === null
      ? copy.matchLoading
      : "failed" in current
        ? copy.matchUnreachable
        : current.people === null
          ? copy.matchFew
          : copy.matchCount.replace("{count}", String(current.people));
  return (
    <p className="nf-body-sm text-[var(--nf-content-secondary)]" aria-live="polite" data-testid="draft-matches">
      {text}
    </p>
  );
}
