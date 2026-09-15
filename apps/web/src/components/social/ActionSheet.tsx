"use client";

import { useRef } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { useOverlay } from "@/lib/ui/use-overlay";
import { PostGlyph, type PostGlyphName } from "./feed/PostGlyph";

/**
 * The sheet behind a card's `…`.
 *
 * A bottom sheet rather than a popover, and that is not a style choice. Every
 * row carries a title AND the sentence that says what it actually does, because
 * "Hide" and "Not interested" and "Mute" are three words people cannot tell
 * apart and the difference between them matters: one is about a post, one is
 * about a feed, one is about a person. Five rows of two lines do not fit in a
 * popover on a 390px screen.
 *
 * **The rows change with what was tapped.** A person's post does not offer
 * "Contact Agent", because there is no agent to contact, and a control that
 * cannot work should not be there to press. What is offered is decided by the
 * caller and passed in, so this component holds no knowledge of what a post is.
 *
 * Escape closes it, focus starts inside, and the page behind does not scroll
 * underneath. All three are what makes a sheet feel like part of the page
 * rather than something stuck on top of it.
 */

export type SheetAction = {
  key: string;
  title: string;
  note: string;
  /** One of the platform's navigation glyphs, or one of the social marks. */
  icon?: UiIconName;
  glyph?: PostGlyphName;
  danger?: boolean;
};

export function ActionSheet({
  label,
  actions,
  onChoose,
  onClose,
}: {
  /** What this sheet is about, for a screen reader. */
  label: string;
  actions: SheetAction[];
  onChoose: (key: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  /* Escape, the Tab trap, the counted scroll lock and the focus return, all
     from the one hook. This sheet used to hand-roll Escape and a bare
     `document.body.style.overflow` flag, which is the uncounted lock: open
     the report sheet over this one and closing the inner sheet gave the page
     its scroll back while this one was still up. Tab was never trapped at
     all, so it walked straight out into the feed behind. */
  useOverlay({ open: true, onClose, panelRef });

  return (
    <div className="nf-actions" role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div ref={panelRef} className="nf-actions__panel">
        <span className="nf-actions__grab" aria-hidden="true" />
        <div role="menu" aria-label={label}>
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              className={`nf-actions__row${action.danger ? " nf-actions__row--danger" : ""}`}
              onClick={() => {
                onClose();
                onChoose(action.key);
              }}
            >
              <span className="nf-actions__icon">
                {action.glyph ? (
                  <PostGlyph name={action.glyph} size={19} />
                ) : (
                  <UiIcon name={action.icon ?? "sliders"} size={19} />
                )}
              </span>
              <span className="min-w-0">
                <span className="nf-actions__title">{action.title}</span>
                <span className="nf-actions__note">{action.note}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * What a card offers, given what it is.
 *
 * One function so the feed, the thread and the profile cannot drift into three
 * slightly different menus. "Contact Agent" appears only where there is an
 * agent, and "Delete" only on your own, which is the whole reason this takes
 * facts rather than a kind name.
 */
export function actionsForPost(options: {
  isMine: boolean;
  isAgentAuthor: boolean;
  hasListing: boolean;
  saved: boolean;
  /**
   * Own post, still live, still inside the fifteen minute window the update
   * policy allows. **Without this row there was no way into the editor at all.**
   * `editPost`, `PostEditor`, the `edited_at` marker and the rescan on edit were
   * all built and all unreachable, because nothing in the product ever asked for
   * the edit action. The window is read at render time, so a card that has sat
   * open past it simply stops offering the row, and the action asks the database
   * again anyway.
   */
  editable: boolean;
  /**
   * Whether this reader has already reposted it, and how many people have.
   *
   * **Repost had no control anywhere in the product.** `toggleRepost` was a
   * validated action with its own rate limit, `post_reposts` had RLS, a counter
   * trigger and `notify_repost`, `PostCard` took an `onRepost` prop, both
   * surfaces wrote an optimistic patch for it, and the Activity tab rendered
   * "reposted this" entries that nothing could ever create. `PostCard`'s own
   * comment said repost "lives in the action sheet rather than in this row",
   * and this sheet had no such row. Six pieces of one feature and no way in.
   */
  reposted: boolean;
  repostCount: number;
  /** Whether there is a person behind this post at all. See the note above the
      mute and block rows: the assistant's reply and the platform's own system
      entry both have a null author, and neither can be muted or blocked. */
  hasAuthor: boolean;
  who: string;
}): SheetAction[] {
  /* The public count, said in words. The card's row has five items already and
     the owner's standing note is that nothing is jam-packed, so the number
     lives here rather than becoming a sixth control at 390px. */
  const soFar =
    options.repostCount > 0
      ? options.repostCount === 1
        ? " One person has so far."
        : ` ${options.repostCount} people have so far.`
      : "";

  const rows: SheetAction[] = [
    {
      key: "save",
      /* The card's own control is a bookmark labelled Save, and this writes the
         exact same `post_reactions` row with the mark SAVE. It used to say
         "Interested" here, which is a second word for one concept and the kind
         of drift that ends with two features nobody can tell apart. */
      title: options.saved ? "Saved" : "Save",
      note: options.saved ? "Take it off your saved list" : "Keep it to come back to",
      glyph: "bookmark",
    },
    {
      key: "repost",
      title: options.reposted ? "Reposted" : "Repost",
      /* Exactly where it goes and no further. A repost appears under Activity
         on your own page, and the author is told. It does not lift the post
         into anybody's feed, because nothing in this product injects a repost
         into a feed, and promising that here would be the fourth control on
         this surface found saying more than it does. */
      note: options.reposted
        ? `Take it off your Activity.${soFar}`
        : `It shows under Activity on your page, and they are told.${soFar}`,
      glyph: "repost",
    },
  ];

  if (options.isAgentAuthor && options.hasListing) {
    rows.push({
      key: "contact",
      title: "Contact agent",
      note: "Send a message about this place",
      glyph: "reply",
    });
  }

  rows.push({
    key: "share",
    title: "Share",
    note: "Send it to somebody",
    glyph: "share",
  });

  /*
   * Copy link, on its own row at last.
   *
   * The `copy` branch has been in the feed's menu handler since the sheet
   * landed and no row ever asked for it, so the only way to get a link was to
   * open the share sheet and hope the platform offered copying. Share now says
   * what it does and this says what it does, which is also the pair every
   * reference screen shows.
   */
  rows.push({
    key: "copy",
    title: "Copy link",
    note: "Paste it anywhere",
    glyph: "link",
  });

  if (options.isMine) {
    if (options.editable) {
      rows.push({
        key: "edit",
        title: "Change what it says",
        note: "For fifteen minutes after posting. It says edited afterwards",
        glyph: "compose",
      });
    }
    rows.push({
      key: "delete",
      title: "Delete this post",
      note: "Replies under it stay, with a note where it was",
      glyph: "trash",
      danger: true,
    });
    return rows;
  }

  /*
   * Mute and block act on a PERSON, and two kinds of post have nobody behind
   * them: the assistant's reply, whose `author_id` is null by design, and the
   * platform's own system entry. Both were offering "Mute this person" and
   * "Block this person", and both handlers answer a missing author with "There
   * is nobody to do that to on this post." That is a control that cannot work,
   * which this sheet's own rules forbid, and it was the assistant's card it
   * appeared on most.
   *
   * Report stays either way. Reporting is about the post, `reportPost` takes a
   * post id, and a machine answer is exactly the thing somebody should be able
   * to report.
   */
  if (options.hasAuthor) {
    rows.push({
      /*
       * One control, named for what it does.
       *
       * This row used to say "Not interested" and "See less like this from X",
       * and what it wrote was a full mute. Understating a control is the same
       * defect as overstating one, and it was harder to spot: somebody taps a
       * soft-sounding row and a person disappears from their feeds, their
       * stories and their threads. There is no per-post ranking signal in this
       * product to feed a genuine "see less", so the honest answer is to offer
       * the thing that exists under its own name.
       */
      key: "mute",
      title: `Mute ${options.who}`,
      note: "They stop showing up in your feeds, stories and threads",
      glyph: "mute",
    });
  }

  rows.push({
    key: "report",
    title: "Report",
    note: "Tell us what is wrong with this",
    glyph: "report",
    danger: true,
  });

  if (options.hasAuthor) {
    rows.push({
      key: "block",
      title: `Block ${options.who}`,
      note: "You will not see each other anywhere on Vallo",
      glyph: "block",
      danger: true,
    });
  }

  return rows;
}
