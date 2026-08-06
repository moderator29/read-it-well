import Link from "next/link";
import type { Dictionary } from "@naijafinds/i18n";
import { LogoMark } from "@/design-system/brand/Logo";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Chip, ChipRow } from "@/components/ui/Chip";

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
 * real entry in the history stack, and costs no JavaScript. `Chip` supplies the
 * 44pt target and `aria-current` for the live one, because nothing is being
 * toggled: the row describes where the reader already is.
 */
export function FeedTabs({ active, t }: { active: FeedTab; t: Dictionary }) {
  const label: Record<FeedTab, string> = {
    "for-you": t.social.tabForYou,
    following: t.social.tabFollowing,
    new: t.social.tabNew,
  };

  return (
    <nav aria-label={t.social.tabsLabel} className="mb-4" data-testid="feed-tabs">
      <ChipRow label={t.social.tabsLabel}>
        {FEED_TABS.map((tab) => (
          <Chip
            key={tab}
            behaviour="link"
            href={tab === "for-you" ? "/around" : `/around?tab=${tab}`}
            size="sm"
            selected={tab === active}
            data-testid={`feed-tab-${tab}`}
          >
            {label[tab]}
          </Chip>
        ))}
      </ChipRow>
    </nav>
  );
}
