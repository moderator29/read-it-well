import Link from "next/link";
import type { Dictionary } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { LineGlyph } from "./LineGlyph";

/** The feed's modes. `new` survives as a valid address for old links: it is
    everything anybody may read, newest first, and it is what For you falls
    back to for somebody who has joined nothing. */
export const FEED_TABS = ["for-you", "following", "new"] as const;
export type FeedTab = (typeof FEED_TABS)[number];

export function isFeedTab(value: string | undefined | null): value is FeedTab {
  return !!value && (FEED_TABS as readonly string[]).includes(value);
}

/**
 * For You / Following.
 *
 * The governing feed image draws two segments in one glass track, the live
 * one filled in brand blue with a line glyph before its word, and that is what
 * this is. Each is a link carrying `?tab=`, so the choice survives a reload,
 * puts a real entry in the history and costs no JavaScript; `aria-current`
 * marks the live one because nothing is toggled, the row says where the
 * reader already is.
 *
 * A third mode, New, used to sit beside these. The image has two, and New is
 * not lost: For you already reads everything for a person with no places, and
 * `?tab=new` still answers for anybody holding that address.
 */
export function FeedTabs({ active, t }: { active: FeedTab; t: Dictionary }) {
  /* The founder's image draws a sparkle on For You and two people on
     Following, both plain line glyphs, 14 CSS px drawn (sparkle at the 28 step, whose
     path fills half its box; people at 20). */
  const segments: { tab: FeedTab; label: string; icon: "sparkle" | "people" }[] = [
    { tab: "for-you", label: t.social.tabForYou, icon: "sparkle" },
    { tab: "following", label: t.social.tabFollowing, icon: "people" },
  ];
  /* An old `?tab=new` link lights For you, which is the mode it reads as. */
  const live: FeedTab = active === "new" ? "for-you" : active;

  return (
    <nav aria-label={t.social.tabsLabel} className="nf-feed-seg" data-testid="feed-tabs">
      {segments.map((segment) => (
        <Link
          key={segment.tab}
          href={segment.tab === "for-you" ? "/around" : `/around?tab=${segment.tab}`}
          className="nf-feed-seg__link"
          aria-current={segment.tab === live ? "page" : undefined}
          data-testid={`feed-tab-${segment.tab}`}
        >
          {segment.icon === "people" ? (
            <LineGlyph name="people" size={20} />
          ) : (
            <UiIcon name={segment.icon} size={28} />
          )}
          {segment.label}
        </Link>
      ))}
    </nav>
  );
}
