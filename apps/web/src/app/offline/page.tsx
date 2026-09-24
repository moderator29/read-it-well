import type { Metadata } from "next";
import { DEFAULT_LOCALE, getDictionary } from "@vallo/i18n";
import { RetryButton } from "./RetryButton";
import { OfflinePacks } from "./OfflinePacks";
import { OfflineShelf } from "./OfflineShelf";
import { SystemMoment } from "./SystemMoment";

/**
 * The offline shell: the brand moment with the real retry.
 *
 * Precached by `public/sw.js` at install and served whenever a navigation
 * cannot reach the network. Two constraints shape it:
 *
 *   1. It must render with no network at all, so it uses no optimised
 *      `next/image` URL and no data source. `SystemMoment` in `offline` mode
 *      draws the tile from `/pwa/icon-192.png`, which the worker precaches
 *      beside this document, and the plate and wordmark from `/brand/`,
 *      which the worker runtime-caches on an allowlist; when a first visit
 *      has not fetched them, the CSS aurora is the designed ground.
 *   2. The copy has to be honest. Vallo never answers a question about
 *      money, messages or bookings from an old copy, so this screen says
 *      that plainly rather than implying more works offline than really
 *      does.
 */
export const metadata: Metadata = {
  title: "You are offline",
  description: "Vallo could not reach the network. Reconnect to carry on.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <SystemMoment
      home="/home"
      offline
      aside="Worth checking: mobile data switched on, aeroplane mode off, and enough left on your bundle."
    >
      <p className="nf-system__overline">Connection</p>
      <h1 className="nf-system__title">You are offline</h1>
      <p className="nf-system__body">
        The connection dropped before this page could load. Nothing you were
        doing has been lost, and nothing was half sent. Your balance, your
        messages and your bookings are never shown from an old copy, so they
        will be the real figures when you are back.
      </p>

      <RetryButton />
      {/* V-35: this phone's inspection packs, with their gate codes. The
          page is precached and static, so the copy is English, the same as
          every other sentence on it. */}
      <OfflinePacks copy={getDictionary(DEFAULT_LOCALE).platform.gate} locale={DEFAULT_LOCALE} />
      {/* V-77: the shortlist this phone holds, with a compare. */}
      <OfflineShelf copy={getDictionary(DEFAULT_LOCALE).platform.shelf} locale={DEFAULT_LOCALE} />
    </SystemMoment>
  );
}
