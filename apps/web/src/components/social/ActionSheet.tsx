"use client";

import { useEffect, useRef } from "react";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
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

  useEffect(() => {
    panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

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
  who: string;
}): SheetAction[] {
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
  ];

  if (options.isAgentAuthor && options.hasListing) {
    rows.push({
      key: "contact",
      title: "Contact agent",
      note: "Send a message about this place",
      icon: "chat-bubble",
    });
  }

  rows.push({
    key: "share",
    title: "Share",
    note: "Send it to somebody, or copy the link",
    glyph: "share",
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
      icon: "settings-gear",
      danger: true,
    });
    return rows;
  }

  rows.push(
    {
      key: "hide",
      title: "Not interested",
      note: `See less like this from ${options.who}`,
      icon: "sliders",
    },
    {
      key: "report",
      title: "Report",
      note: "Tell us what is wrong with this",
      icon: "settings-gear",
      danger: true,
    },
    {
      key: "block",
      title: `Block ${options.who}`,
      note: "You will not see each other anywhere on RentMe",
      icon: "user",
      danger: true,
    },
  );

  return rows;
}
