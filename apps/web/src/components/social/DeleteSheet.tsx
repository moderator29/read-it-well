"use client";

import { Sheet } from "@/components/ui/Sheet";
import { DragToConfirm } from "@/components/ui/DragToConfirm";

/**
 * TAKING SOMETHING DOWN, CONFIRMED ONE WAY (ONE-PRODUCT-DECISIONS: "How is
 * something destructive confirmed? `DragToConfirm`, everywhere. No browser
 * `confirm()`").
 *
 * The feed, the thread, a story and a comment each asked with
 * `window.confirm`, a grey system box that cannot be styled, cannot be
 * translated by us, blocks the page, and on Android's WebView reads as a
 * crash. This is the one sheet all four open instead: a title that names the
 * thing, one line on what happens to everything around it, and the slide.
 *
 * `onConfirm` is the real deletion. It resolves `false` (or throws) when the
 * server refused, so the slide never says "Deleted" for something that is
 * still there; the caller puts the reason on screen. On success the caller
 * takes the thing out of its list and the sheet closes itself a beat later,
 * after the track has said "Deleted".
 */
/** The three things a member can take down, and what each one leaves. */
export const DELETE_WORDS = {
  post: {
    title: "Delete this post?",
    body: "Replies under it stay, with a note where it was.",
  },
  comment: {
    title: "Delete this comment?",
    body: "Replies to it stay, with a note where it was.",
  },
  story: {
    title: "Take this story down?",
    body: "The comments under it stay.",
  },
} as const;

export function DeleteSheet({
  open,
  title,
  body,
  onConfirm,
  onClose,
}: {
  open: boolean;
  /** "Delete this post?" */
  title: string;
  /** What happens to the replies or comments around it. One sentence. */
  body: string;
  onConfirm: () => Promise<boolean>;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={title}
      closeLabel="Keep it"
      detents={[0.42]}
      testId="delete-sheet"
    >
      <p className="nf-delete-sheet__body">{body}</p>
      <DragToConfirm
        tone="danger"
        label="Slide to delete"
        keyboardLabel="Delete"
        confirmingLabel="Deleting"
        confirmedLabel="Deleted"
        errorLabel="It was not deleted. Try again."
        onConfirm={async () => {
          const done = await onConfirm();
          /* Let "Deleted" be read for a beat, then the sheet leaves. */
          if (done) window.setTimeout(onClose, 480);
          return done;
        }}
        className="nf-delete-sheet__slide"
        data-testid="delete-slide"
      />
    </Sheet>
  );
}
