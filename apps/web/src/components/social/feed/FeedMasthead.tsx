import Link from "next/link";
import type { Dictionary } from "@vallo/i18n";
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
 * So: filters on the left where a thumb reaches without crossing the screen,
 * the screen's own name in the centre, and the way to settings on the right.
 *
 * ---------------------------------------------------------------------------
 * AND THE MARK IN THE CENTRE WAS A SECOND VALLO MARK.
 *
 * It was a `LogoMark` at 30px, and on a phone `AppShell` already draws the logo
 * in the header about a hundred pixels directly above it. One screen, two
 * marks, one under the other. `AppShell`'s own comment states the rule it was
 * breaking: "repeating a logo twice on one screen is noise", which is exactly
 * why the shell hides its wordmark above lg, where the rail carries it.
 *
 * The centre is not left empty, because a row of two icon buttons with a hole
 * between them is not a masthead. It carries the screen's NAME, which is the
 * one thing the chrome above does not say: the shell's header is the product
 * and this line is the page. It is also a real `h1`, so this screen finally has
 * a heading; it had none, and the name was `sr-only` text beside a picture.
 *
 * A server component. Every control is a link, so none of it ships as
 * JavaScript.
 */
export function FeedMasthead({ t }: { t: Dictionary }) {
  return (
    <header className="mb-sm flex items-center justify-between gap-sm" data-testid="feed-masthead">
      <Link
        href="/around?filters=1"
        aria-label={t.social.filters}
        data-testid="feed-filters"
        className="nf-icon-btn h-10 w-10 shrink-0"
      >
        <UiIcon name="sliders" size={18} />
      </Link>

      {/* `t.nav.around`, WHICH IS THE PAGE'S NAME, and not `t.social.feedName`,
          which is "Vallo feed". Putting the product's name here would be the
          same duplication as the mark it replaced, one word instead of one
          picture. This is the word the rail and the tab bar already use for
          this destination, so the chrome and the heading agree. No truncation:
          a heading that clips is a heading nobody can read. */}
      <h1 className="nf-h4 min-w-0 flex-1 text-center [overflow-wrap:anywhere]">
        {t.nav.around}
      </h1>

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
