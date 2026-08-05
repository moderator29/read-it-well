"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { StoryCard } from "@/lib/social/stories-queries";
import { STORY_COPY } from "@/lib/social/stories-schema";

type RailTab = "stories" | "updates";
const RAIL_TABS: readonly RailTab[] = ["stories", "updates"] as const;

/**
 * The rail beside a story.
 *
 * The side navigation the owner asked for by name: somebody reading one story
 * moves to the next without leaving the viewer. On a desktop it is a genuine
 * rail down the right. On a phone there is no room for a rail, so it becomes a
 * strip below the picture rather than disappearing, because "the next story" is
 * the single most likely thing anybody wants next and hiding it behind a back
 * button costs a whole page load on a connection where that hurts.
 *
 * Two tabs, because the owner asked for Updates beside Stories. Updates is the
 * same conversation surface the rest of the product already has, so rather than
 * inventing a second inbox it points at the notifications this platform
 * already writes from database triggers: follows, replies, mentions, likes,
 * reposts, badge grants and every moderation transition. A tab that duplicated
 * those would be a second thing to keep in step with the first.
 */
export function StoryRail({
  stories,
  currentId,
}: {
  stories: StoryCard[];
  currentId: string;
}) {
  const [tab, setTab] = useState<RailTab>("stories");
  const others = stories.filter((story) => story.id !== currentId);
  const listRef = useRef<HTMLDivElement>(null);

  /* Arrow keys move between the two, Tab leaves the pair. Same handler shape
     as `ProfileTabs` and `DistrictChips`, so there is one tab pattern in this
     codebase rather than three near-misses. */
  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = RAIL_TABS.indexOf(tab);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % RAIL_TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + RAIL_TABS.length) % RAIL_TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = RAIL_TABS.length - 1;
    else return;

    event.preventDefault();
    const target = RAIL_TABS[next];
    if (!target) return;
    setTab(target);
    listRef.current?.querySelector<HTMLButtonElement>(`#nf-rail-tab-${target}`)?.focus();
  };

  return (
    <aside className="nf-story-rail" aria-label="More to read">
      <div
        ref={listRef}
        role="tablist"
        aria-label="More to read"
        className="nf-story-rail__tabs"
        onKeyDown={onKeyDown}
      >
        {RAIL_TABS.map((key) => {
          const selected = tab === key;
          return (
            <button
              key={key}
              id={`nf-rail-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              /* Only the live tab has a panel to name; one panel is rendered. */
              aria-controls={selected ? `nf-rail-panel-${key}` : undefined}
              tabIndex={selected ? 0 : -1}
              className="nf-social-tab"
              onClick={() => setTab(key)}
            >
              {key === "stories" ? STORY_COPY.stories : STORY_COPY.updates}
            </button>
          );
        })}
      </div>

      {/* The region the two tabs swap. It did not exist before, so the pair
          announced themselves as tabs and controlled nothing a reader could
          be moved to. */}
      <div
        id={`nf-rail-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`nf-rail-tab-${tab}`}
        tabIndex={-1}
      >
      {tab === "stories" ? (
        others.length === 0 ? (
          <p className="nf-story-rail__empty">
            This is the only story here so far. Yours would be the second.
          </p>
        ) : (
          <ul className="nf-story-rail__list">
            {others.map((story) => (
              <li key={story.id}>
                <Link href={`/stories/${story.id}`} className="nf-story-rail__card">
                  <span className="nf-story-rail__thumb">
                    {story.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={story.imageUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="nf-story-plate__art" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="nf-story-rail__headline">{story.headline}</span>
                    <span className="nf-story-rail__meta">
                      {story.authorLabel} · {story.createdLabel}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="nf-story-rail__updates">
          <p>
            Everything that happens to you on RentMe lands in one place: somebody
            following you, replying to you, naming you in a post, liking or
            reposting what you wrote, and every decision we make about it.
          </p>
          <Link href="/notifications" className="nf-btn nf-btn--glass mt-3 w-full">
            <UiIcon name="bell" size={15} />
            Open your updates
          </Link>
        </div>
      )}
      </div>
    </aside>
  );
}
