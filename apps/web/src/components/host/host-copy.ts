"use client";

import { getDictionary } from "@vallo/i18n";
import { useClientLocale } from "@/lib/i18n/use-client-locale";

/**
 * The host workspace's words for a client component, in the reader's
 * language (C11). Server pages read `t.hostWorkspace` directly.
 */
export function useHostCopy() {
  return getDictionary(useClientLocale()).hostWorkspace;
}
