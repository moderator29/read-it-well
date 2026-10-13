import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import "./feed-v2.css";

/**
 * The feed's modes. `for-you` and `friends` are the two the control draws.
 *
 *   for-you   the places you joined and everything said to the platform at
 *             large; for somebody who has joined nothing, everywhere.
 *   friends   what the people you follow have written, newest first.
 *
 * `following` and `new` survive as valid addresses for old links. `following`
 * lit the second half before it meant people (it read the places you joined),
 * and the second half is what it opens now; `new` is everything anybody may
 * read and lights For you, which is what For you falls back to.
 */
export const FEED_TABS = ["for-you", "friends", "following", "new"] as const;
export type FeedTab = (typeof FEED_TABS)[number];

export function isFeedTab(value: string | undefined | null): value is FeedTab {
  return !!value && (FEED_TABS as readonly string[]).includes(value);
}

/** The control's two halves: an old address is read as the half it opens. */
export function liveTab(active: FeedTab): "for-you" | "friends" {
  return active === "friends" || active === "following" ? "friends" : "for-you";
}

/**
 * For you / Friends: a small capsule control, two compact pills inside one
 * rounded track, the chosen one filled. Each is a link carrying `?tab=`, so
 * the choice survives a reload, puts a real entry in the history and costs no
 * script; `aria-current` marks the live one because nothing is toggled, the
 * row says where the reader already is. The pills look small and are not: each
 * link's tap target is 44px tall (`feed-v2.css`).
 */
export function FeedTabs({ active, t }: { active: FeedTab; t: Dictionary }) {
  const words = t.feedV2.feed;
  const live = liveTab(active);
  const segments = [
    { tab: "for-you", label: words.tabForYou, href: "/around" },
    { tab: "friends", label: words.tabFriends, href: "/around?tab=friends" },
  ] as const;

  return (
    <nav aria-label={words.tabsLabel} className="nf-fv2-seg" data-testid="feed-tabs" data-live={live}>
      <div className="nf-fv2-seg__track">
        {segments.map((segment) => (
          <Link
            key={segment.tab}
            href={segment.href}
            className="nf-fv2-seg__link"
            aria-current={segment.tab === live ? "page" : undefined}
            data-testid={`feed-tab-${segment.tab}`}
          >
            {segment.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
