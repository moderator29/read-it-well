"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromAcceptLanguage,
  type Locale,
} from "@vallo/i18n/core";
import { LOCALE_COOKIE } from "@/lib/locale.constants";

/**
 * The reader's locale, read on the client (the reasoning, and the SSR safety
 * argument, are at the top of `use-client-dictionary.ts`). In a module of its
 * own because most callers want the locale only, to format a number or a
 * date, and the dictionary hook's module imports all four dictionaries: a
 * component that needed "en" or "yo" shipped every word of every language.
 */

/**
 * Nothing to subscribe to: a cookie fires no events. Language changes come
 * through Settings' `LanguageRow`, which writes the cookie and calls
 * `router.refresh()`, and that re-renders this component - at which point
 * `useSyncExternalStore` re-reads `getSnapshot` and the new locale lands. A
 * polling subscription would burn a timer forever to catch a change that
 * already arrives on its own.
 */
function subscribe(): () => void {
  return () => {};
}

/**
 * Read on the client. Split out so the snapshot stays a plain string.
 *
 * The order here has to be the SAME order `lib/locale.ts` uses on the server:
 * stored choice, then what the browser reads, then English. It was cookie then
 * English alone, which agreed with the server while the server also stopped at
 * English. Now that `getLocale` negotiates `Accept-Language`, a first-time
 * visitor on a Yorùbá phone gets a Yorùbá page from the server, and this hook
 * would have answered "en" for the handful of default strings it owns: one back
 * button in English on an otherwise Yorùbá screen.
 *
 * `navigator.languages` is the same preference list the browser puts in the
 * header, already in the order it means, so joining it with commas produces a
 * valid `Accept-Language` value and the identical parser decides both sides.
 * There is deliberately no second implementation of the matching rule here.
 */
function readClientLocale(): Locale {
  // Cookies are `name=value; name=value`. Match on a boundary so a cookie
  // whose name merely ENDS with ours (`x_nf_locale`) cannot answer for it.
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`)
  );
  const raw = match?.[1];
  const value = raw === undefined ? undefined : decodeURIComponent(raw);
  if (isLocale(value)) return value;

  /* Guarded rather than assumed: `navigator.languages` is absent in a few
     embedded browsers, and `navigator.language` is a single string. Either
     shape is fed to the parser as a header, and no shape at all falls to
     English exactly as before. */
  const preferred =
    typeof navigator === "undefined"
      ? null
      : navigator.languages && navigator.languages.length > 0
      ? navigator.languages.join(",")
      : navigator.language ?? null;

  return localeFromAcceptLanguage(preferred) ?? DEFAULT_LOCALE;
}

/**
 * The snapshot is the locale STRING, not the dictionary object, because
 * `useSyncExternalStore` compares snapshots by identity and bails out of the
 * render when they are equal. A string compares by value and always settles;
 * returning a freshly derived object here would be a new reference on some
 * future refactor and loop.
 */
function serverSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

/** The active locale on the client. `DEFAULT_LOCALE` until hydration lands. */
export function useClientLocale(): Locale {
  return useSyncExternalStore(subscribe, readClientLocale, serverSnapshot);
}
