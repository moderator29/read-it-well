"use client";

import { useEffect } from "react";
import { recordListingViews } from "@/lib/listings/views-actions";

/**
 * Tells the platform what this person saw or opened, once, after the page has
 * painted (V-73). Renders nothing. The server de-duplicates per viewer per
 * day, so a reload or a strict-mode double effect counts once.
 */
export function RecordViews({ seen = [], opened = null }: { seen?: string[]; opened?: string | null }) {
  const key = `${seen.join(",")}|${opened ?? ""}`;
  useEffect(() => {
    void recordListingViews(seen, opened);
    // The key is the dependency: the same ids are the same visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}
