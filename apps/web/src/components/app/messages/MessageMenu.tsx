"use client";

/**
 * The message menu: opened by a long press on a bubble (or a right click on
 * the web). It holds the actions a person can take on ONE message, and only
 * the ones that apply to it:
 *
 *   Reply                 always, on a message that has been sent
 *   Copy                  when the message has words
 *   Delete for me         always, on your side only
 *   Delete for everyone   only on your own messages; the window is decided by
 *                         the database, and a refused delete says why
 *
 * Forward is a separate step (a chooser of conversations), not drawn here yet.
 */

import { useEffect } from "react";

export type MessageMenuProps = {
  canCopy: boolean;
  canDeleteEveryone: boolean;
  onReply: () => void;
  onCopy: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onClose: () => void;
};

export function MessageMenu({
  canCopy,
  canDeleteEveryone,
  onReply,
  onCopy,
  onDeleteForMe,
  onDeleteForEveryone,
  onClose,
}: MessageMenuProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" className="nf-msg-menu__scrim" aria-label="Close menu" onClick={onClose} />
      <div role="menu" aria-label="Message options" className="nf-msg-menu" data-testid="message-menu">
        <button type="button" role="menuitem" className="nf-msg-menu__item" onClick={onReply}>
          Reply
        </button>
        {canCopy ? (
          <button type="button" role="menuitem" className="nf-msg-menu__item" onClick={onCopy}>
            Copy
          </button>
        ) : null}
        <button type="button" role="menuitem" className="nf-msg-menu__item" onClick={onDeleteForMe}>
          Delete for me
        </button>
        {canDeleteEveryone ? (
          <button
            type="button"
            role="menuitem"
            className="nf-msg-menu__item nf-msg-menu__item--danger"
            onClick={onDeleteForEveryone}
          >
            Delete for everyone
          </button>
        ) : null}
      </div>
    </>
  );
}
