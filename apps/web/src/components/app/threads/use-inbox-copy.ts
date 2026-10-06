"use client";

import type { Dictionary, Locale } from "@vallo/i18n/core";
import { useClientDictionary, useClientLocale } from "@/lib/i18n/use-client-dictionary";

/**
 * THE INBOX FAMILY'S WORDS, WITH OR WITHOUT A SERVER PARENT.
 *
 * A server page that holds the dictionary passes `experienceInbox` down and
 * the client component reads that. A surface with no such parent (the
 * preview harness, a client island) falls back to the reader's own
 * dictionary, which every client in the shell already pulls in through
 * `PageHeader`, so the fallback costs no new bytes. The hooks are called
 * unconditionally, so the rules of hooks hold either way.
 */
export function useInboxCopy(provided?: Dictionary["experienceInbox"]): Dictionary["experienceInbox"] {
  const dictionary = useClientDictionary();
  return provided ?? dictionary.experienceInbox;
}

export function useInboxLocale(provided?: Locale): Locale {
  const own = useClientLocale();
  return provided ?? own;
}
