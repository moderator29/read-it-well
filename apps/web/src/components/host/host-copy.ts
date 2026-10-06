"use client";

import { useScopedCopy } from "@/lib/i18n/copy-scope";

/**
 * The host workspace's words for a client component, in the reader's
 * language (C11). Server pages read `t.hostWorkspace` directly.
 *
 * Read from the route's CopyScope (`hostWorkspace`, W13), which the page
 * fills from its own dictionary. A `getDictionary` call here shipped the whole
 * dictionary, 398KB gzipped, in the host wizard's first load.
 */
export function useHostCopy() {
  return useScopedCopy("hostWorkspace");
}
