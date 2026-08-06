"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_LOCALE,
  getDictionary,
  isLocale,
  type Dictionary,
  type Locale,
} from "@naijafinds/i18n";
import { LOCALE_COOKIE } from "@/lib/locale.constants";

/**
 * The locale, read on the client, for client components with no server parent
 * to hand them a dictionary.
 *
 * ## Why this exists
 *
 * This platform has no locale context by design: the server component that
 * resolved the cookie passes `t: Dictionary` down as a prop, and that is still
 * the house pattern (see `components/app/place/PlaceFields.tsx`). It keeps the
 * dictionary out of the client bundle wherever a server parent already has it,
 * and it makes the data flow obvious in the file you are reading.
 *
 * That pattern breaks down in exactly one place: a shared `"use client"`
 * control with a DEFAULT string, used on tens of screens, where the caller
 * usually has no `t` to give it. `PageHeader` and `BackButton` are the case
 * that forced this. Between them they are the back affordance on roughly fifty
 * screens, and their default label was the literal `"Back"` - so on a Yorùbá,
 * Hausa or Igbo phone the one control every single screen carries was in
 * English. Threading a dictionary through fifty call sites to move one word is
 * the wrong trade.
 *
 * It is safe because `getDictionary` is a pure function over static objects.
 * `@naijafinds/i18n` imports nothing server-only, and the locale itself lives
 * in a plain cookie whose name was split into `locale.constants.ts` precisely
 * so the client could read it (`LanguageSwitcher` already writes it there).
 *
 * ## THIS IS A LAST RESORT, NOT THE NEW WAY TO READ COPY
 *
 * Reach for it only when ALL of these hold:
 *
 *   1. The component is `"use client"`.
 *   2. It has no server parent that could pass `t` - or has fifty of them.
 *   3. The string is a DEFAULT that a caller with a real `t` can still beat.
 *
 * If a server component renders it and knows the locale, pass `t` as a prop.
 * Every dictionary read through this hook pulls all four locales into the
 * client bundle and moves a translation decision from render time on the server
 * to hydration time in the browser. That is a real cost, paid once here so the
 * back button speaks the user's language, and it should not be paid again
 * casually.
 *
 * ## SSR safety
 *
 * `document` does not exist on the server, so the first render - server render
 * AND the hydration render that must match it - resolves to `DEFAULT_LOCALE`.
 * `useSyncExternalStore` is used rather than `useState` + `useEffect` because
 * it takes a separate `getServerSnapshot`: React uses that value for hydration
 * and then re-checks the real snapshot in a passive effect, re-rendering if it
 * moved. The trees therefore match at hydration by construction, and no
 * mismatch warning is possible. On a non-English phone the back button's
 * accessible name settles one paint after mount, which nothing can perceive.
 */

/**
 * Nothing to subscribe to: a cookie fires no events. Language changes come
 * through `LanguageSwitcher`, which writes the cookie and calls
 * `router.refresh()`, and that re-renders this component - at which point
 * `useSyncExternalStore` re-reads `getSnapshot` and the new locale lands. A
 * polling subscription would burn a timer forever to catch a change that
 * already arrives on its own.
 */
function subscribe(): () => void {
  return () => {};
}

/** Read on the client. Split out so the snapshot stays a plain string. */
function readLocaleCookie(): Locale {
  // Cookies are `name=value; name=value`. Match on a boundary so a cookie
  // whose name merely ENDS with ours (`x_nf_locale`) cannot answer for it.
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`),
  );
  const raw = match?.[1];
  const value = raw === undefined ? undefined : decodeURIComponent(raw);
  return isLocale(value) ? value : DEFAULT_LOCALE;
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
  return useSyncExternalStore(subscribe, readLocaleCookie, serverSnapshot);
}

/** The active dictionary on the client. Read the caveats at the top first. */
export function useClientDictionary(): Dictionary {
  return getDictionary(useClientLocale());
}
