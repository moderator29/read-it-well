import type { Metadata } from "next";
import { DEFAULT_LOCALE, getDictionary } from "@vallo/i18n";
import { RetryButton } from "./RetryButton";
import { OfflinePacks } from "./OfflinePacks";
import { OfflineShelf } from "./OfflineShelf";
import { OfflineScreen } from "./OfflineScreen";

/**
 * The offline shell: the navy ground, one Island, one action (W11, 6 October
 * 2026; `offline.css`). The brand moment with the real retry.
 *
 * Precached by `public/sw.js` at install and served whenever a navigation
 * cannot reach the network. Two constraints shape it:
 *
 *   1. It must render with no network at all, so it uses no optimised
 *      `next/image` URL, no image file and no data source: the mark is the
 *      inline vector and the ground is two gradients, so there is no hole when
 *      a first visit has fetched nothing.
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
  const t = getDictionary(DEFAULT_LOCALE);
  const copy = t.experienceEntry;
  /* V-97 and W11: the navy ground, one Island, one action. The page is
     precached and static, so the copy is English, the same as every other
     sentence on it. */
  return (
    <OfflineScreen
      title={copy.offlineTitle}
      body={copy.offlineBody}
      action={
        <RetryButton
          label={copy.offlineRetry}
          statusOnline={copy.offlineStatusOnline}
          statusOffline={copy.offlineStatusOffline}
        />
      }
    >
      {/* V-35: this phone's inspection packs, with their gate codes. */}
      <OfflinePacks copy={t.platform.gate} locale={DEFAULT_LOCALE} />
      {/* V-77: the shortlist this phone holds, with a compare. */}
      <OfflineShelf copy={t.platform.shelf} locale={DEFAULT_LOCALE} />
    </OfflineScreen>
  );
}
