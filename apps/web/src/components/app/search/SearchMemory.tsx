"use client";

import { useEffect } from "react";
import { rememberSearch, rememberView } from "@/lib/search/memory";
import type { ViewKey } from "@/lib/listings/search-params";

/**
 * Records the hunt that is on screen. Renders nothing.
 *
 * Two memories are written here rather than at the controls that cause them,
 * for one reason: a search can be reached half a dozen ways (the text box, a
 * city chip, a sort chip, the filter drawer, a shared link, the back button)
 * and hanging a `remember()` on each of those is how five of them stay in step
 * and the sixth quietly does not. The page itself always knows what is being
 * looked at, so the page is what records it.
 *
 * `label` and `href` are computed on the SERVER, from the same parsed query
 * that produced the results, so a chip can never describe a search the page
 * did not actually run.
 *
 * An empty `label` means there is nothing worth remembering: bare `/search`
 * with no text and no filters is not a hunt anybody wants offered back to
 * them, and recording it would push five real searches off the end of the
 * list every time somebody opened the tab.
 */
export function SearchMemory({
  view,
  label,
  href,
}: {
  view: ViewKey;
  label: string;
  href: string;
}) {
  useEffect(() => {
    rememberView(view);
  }, [view]);

  useEffect(() => {
    if (!label) return;
    rememberSearch({ label, href });
  }, [label, href]);

  return null;
}
