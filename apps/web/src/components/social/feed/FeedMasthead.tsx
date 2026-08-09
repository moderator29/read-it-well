import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";

/** The three feeds, in the order every product of this shape puts them. */
export const FEED_TABS = ["for-you", "following", "new"] as const;
export type FeedTab = (typeof FEED_TABS)[number];

export function isFeedTab(value: string | undefined | null): value is FeedTab {
  return !!value && (FEED_TABS as readonly string[]).includes(value);
}

/**
 * The head of the feed.
 *
 * It used to be a `PageHeader`: a back chevron, the word "Around", and a
 * "Manage places" button wide enough to be the loudest thing on the screen.
 * Three problems in one row. A primary tab does not need a back chevron -
 * there is nothing behind it. The title named the navigation rather than the
 * product. And the widest, highest-contrast control on a reading surface
 * pointed away from the reading.
 *
 * So: the mark in the centre, small, because a masthead is an identity and not
 * a banner; filters on the left where a thumb reaches without crossing the
 * screen; the way to settings on the right. Two icon buttons and a logo, which
 * is what the top of a feed is in every product that has one.
 *
 * A server component. Every control is a link, so none of it ships as
 * JavaScript.
 */
export function FeedMasthead({ t }: { t: Dictionary }) {
  return (
    <header className="mb-3 flex items-center justify-between gap-3" data-testid="feed-masthead">
      <Link
        href="/around?filters=1"
        aria-label={t.social.filters}
        data-testid="feed-filters"
        className="nf-icon-btn h-10 w-10 shrink-0"
      >
        <UiIcon name="sliders" size={18} />
      </Link>

      {/* The identity, not a heading. `sr-only` carries the name the screen is
          called so a screen reader is not handed a bare image. */}
      <span className="flex min-w-0 flex-1 items-center justify-center">
        <LogoMark size={30} />
        <span className="sr-only">{t.social.feedName}</span>
      </span>

      <Link
        href="/around/settings"
        aria-label={t.social.feedSettings}
        data-testid="feed-settings"
        className="nf-icon-btn h-10 w-10 shrink-0"
      >
        <UiIcon name="settings-gear" size={18} />
      </Link>
    </header>
  );
}

/**
 * For you, Following, New.
 *
 * The chip row that used to sit here listed the reader's own places, which is
 * a filter and not a feed: it answered "which room" when the question at the
 * top of a timeline is "which timeline". Rooms moved to settings, where the
 * rest of the directory already lives.
 *
 * Each tab is a link carrying `?tab=`, so the choice survives a reload, puts a
 * real entry in the history stack, and costs no JavaScript. `aria-current` marks
 * the live one, because nothing is being toggled: the row describes where the
 * reader already is.
 *
 * **These are not chips any more.** They were, and a chip is the wrong object:
 * a chip is a filter, a fat 44px pill built for a row of eight on /search, and
 * drawn that way these three were the loudest thing above the reading. The
 * owner asked for them smaller and rectangular rather than round, which is also
 * what they should have been: this is the feed's top-level navigation, so it
 * gets a tab's shape and a tab's rule underneath. `.nf-feedtab` keeps the 44pt
 * touch target with a centred overlay, so nothing is given up for the smaller
 * paint.
 */
export function FeedTabs({ active, t }: { active: FeedTab; t: Dictionary }) {
  const label: Record<FeedTab, string> = {
    "for-you": t.social.tabForYou,
    following: t.social.tabFollowing,
    new: t.social.tabNew,
  };

  return (
    <nav aria-label={t.social.tabsLabel} className="mb-block" data-testid="feed-tabs">
      {/*
        The rule under this row is gone, at the owner's request and on the
        merits. It ran the full width of the screen under three pill shaped
        controls that already read as a group, so it was a line separating the
        tabs from nothing in particular. Underlines belong to tabs that sit
        flush against their panel; these float above it.
      */}
      <div className="nf-feedtabs">
        {FEED_TABS.map((tab) => (
          <Link
            key={tab}
            href={tab === "for-you" ? "/around" : `/around?tab=${tab}`}
            className="nf-feedtab"
            aria-current={tab === active ? "page" : undefined}
            data-testid={`feed-tab-${tab}`}
          >
            {label[tab]}
          </Link>
        ))}
      </div>
    </nav>
  );
}
