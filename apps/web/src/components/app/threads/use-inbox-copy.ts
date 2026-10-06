"use client";

import { use } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";
import { useClientLocale } from "@/lib/i18n/use-client-locale";

/**
 * THE INBOX FAMILY'S WORDS, FROM THE SERVER PARENT.
 *
 * A server page that holds the dictionary passes its slice of
 * `experienceInbox` down, and the client component reads that. That is the
 * path every real route takes, and it costs the page only the words it uses.
 *
 * WHY THIS NO LONGER FALLS BACK TO A CLIENT-SIDE DICTIONARY HOOK (Session 3,
 * W13, measured on a production build; that hook has since been deleted). The old fallback called the dictionary hook
 * unconditionally, so every route that drew a thread, the inbox, the
 * notification list or the support search shipped the whole `@vallo/i18n`
 * index in its first load: 1,351,758 bytes raw, 398,654 gzipped. It took
 * `/messages/[id]` from 343 to 750KB gzipped, with the page already passing
 * nothing that needed it. The comment that used to sit here said the
 * dictionary was already in every client through `PageHeader`; the build
 * showed it was not.
 *
 * A surface with no server parent (a preview harness) still works: it
 * suspends once on a dynamic import of the dictionary, which the bundler
 * puts in a chunk of its own that no route's first load ever includes, and
 * reads the reader's own locale from it. `use()` may be called
 * conditionally; the locale hook is called on every render, so the rules of
 * hooks hold either way.
 */
type Inbox = Dictionary["experienceInbox"];

const loaded = new Map<Locale, Promise<Inbox>>();

function inboxFor(locale: Locale): Promise<Inbox> {
  let pending = loaded.get(locale);
  if (!pending) {
    pending = import("@vallo/i18n").then((i18n) => i18n.getDictionary(locale).experienceInbox);
    loaded.set(locale, pending);
  }
  return pending;
}

/** One part of the inbox family's words: the provided slice, else the reader's own. */
export function useInboxPart<K extends keyof Inbox>(key: K, provided?: Inbox[K]): Inbox[K] {
  const locale = useClientLocale();
  if (provided) return provided;
  return use(inboxFor(locale))[key];
}

/** The whole family, for a caller that needs several parts. */
export function useInboxCopy(provided?: Inbox): Inbox {
  const locale = useClientLocale();
  if (provided) return provided;
  return use(inboxFor(locale));
}

export function useInboxLocale(provided?: Locale): Locale {
  const own = useClientLocale();
  return provided ?? own;
}
