"use client";

import { useState, useTransition } from "react";
import { editPost } from "@/lib/social/posts-actions";
import { EDIT_WINDOW_MINUTES, POST_MAX } from "@/lib/social/posts-schema";

/**
 * Fixing what you wrote.
 *
 * In place inside the card rather than on a page of its own, because an edit is
 * almost always a typo and sending somebody to another screen to change one
 * letter is the kind of thing that makes people give up and post again instead.
 *
 * Two honest states most editors skip.
 *
 * The window closing is a real outcome and gets a real sentence. Fifteen minutes
 * is enforced by `posts_update_own`, and a page that has been open for twenty of
 * them will offer this and be refused; the refusal says what happened rather
 * than "something went wrong".
 *
 * An edit is rescanned. `posts_scan` fires on UPDATE as well as INSERT, so a
 * change that introduces an account number holds the post exactly as a new one
 * would. When that happens this says so plainly, because a post that quietly
 * stopped being visible after an edit is the worst possible way to find out.
 */
export function PostEditor({
  postId,
  initialBody,
  onDone,
  onSaved,
}: {
  postId: string;
  initialBody: string;
  onDone: () => void;
  /** Given the new body, so the card can show it without waiting for a reload. */
  onSaved: (body: string, held: boolean) => void;
}) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const trimmed = body.trim();
  const left = POST_MAX - body.length;
  const changed = trimmed.length > 0 && trimmed !== initialBody.trim();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await editPost({ postId, body: trimmed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(trimmed, result.data.held);
      onDone();
    });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && !pending) save();
      }}
    >
      <textarea
        className="nf-field min-h-[92px] w-full resize-y text-[0.97rem] leading-[1.5]"
        value={body}
        maxLength={POST_MAX}
        autoFocus
        aria-label="Change what you wrote"
        onChange={(event) => setBody(event.target.value)}
      />

      <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
        You can change a post for {EDIT_WINDOW_MINUTES} minutes after writing it.
        It will say edited afterwards, and anything you add is checked the same
        way a new post is.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm leading-relaxed text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-3">
        {left < 240 ? (
          <span
            className={`nf-numeric text-xs ${
              left < 0 ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"
            }`}
          >
            {left}
          </span>
        ) : null}
        <button
          type="button"
          className="nf-btn nf-btn--ghost h-10 px-4 text-sm"
          onClick={onDone}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="nf-btn nf-btn--primary h-10 px-5 text-sm"
          disabled={!changed || pending}
        >
          {pending ? "Saving" : "Save"}
        </button>
      </div>
    </form>
  );
}
