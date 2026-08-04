"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dropPost, replyToPost } from "@/lib/social/posts-actions";
import {
  COMPOSABLE_KINDS,
  KIND_HINT,
  KIND_LABEL,
  KIND_PLACEHOLDER,
  POST_COPY,
  POST_MAX,
  type ComposableKind,
} from "@/lib/social/posts-schema";

/**
 * Writing something.
 *
 * One component for both jobs, because a reply is a post with a parent and
 * splitting them would mean two composers to keep in step. The `parentId` prop
 * is the only difference a person can see, and it changes the words rather than
 * the mechanics.
 *
 * The honest bit: when the scanner holds a post, this says so plainly instead
 * of showing a success. A composer that says "posted" for something only its
 * author can see has lied, and the person then spends the afternoon wondering
 * why nobody replied.
 */
export function Composer({
  areaId,
  parentId,
  signedIn,
  isMember,
  areaName,
  autoFocus = false,
  onDone,
}: {
  areaId?: string;
  parentId?: string;
  signedIn: boolean;
  isMember?: boolean;
  areaName?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ComposableKind>("GIST");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);

  const isReply = Boolean(parentId);
  const left = POST_MAX - body.length;
  const canSend = body.trim().length > 0 && !pending;

  if (!signedIn) {
    return (
      <div className="nf-card nf-post p-4 text-center">
        <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
          Sign in to {isReply ? "reply" : `post${areaName ? ` around ${areaName}` : ""}`}.
        </p>
      </div>
    );
  }

  if (!isReply && isMember === false) {
    return (
      <div className="nf-card nf-post p-4 text-center">
        <p className="text-sm leading-relaxed text-[var(--nf-content-muted)]">
          Join this place first and you can post in it.
        </p>
      </div>
    );
  }

  if (held) {
    return (
      <div className="nf-card nf-post p-4">
        <p className="text-sm font-semibold text-[var(--nf-content-primary)]">
          It is with us
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--nf-content-muted)]">
          {POST_COPY.held}
        </p>
        <button
          type="button"
          className="nf-btn nf-btn--ghost mt-3 inline-flex h-9 items-center px-4 text-xs"
          onClick={() => {
            setHeld(false);
            setBody("");
            onDone?.();
          }}
        >
          Write another
        </button>
      </div>
    );
  }

  const send = () => {
    setError(null);
    startTransition(async () => {
      const result = parentId
        ? await replyToPost({ parentId, body })
        : await dropPost({ areaId: areaId as string, kind, body });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.held) {
        setHeld(true);
        return;
      }
      setBody("");
      onDone?.();
      router.refresh();
    });
  };

  return (
    <form
      className="nf-card nf-post"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) send();
      }}
    >
      {!isReply ? (
        <div className="mb-3 flex gap-2" role="radiogroup" aria-label="What are you posting?">
          {COMPOSABLE_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              onClick={() => setKind(option)}
              className={`inline-flex h-9 items-center rounded-[var(--nf-radius-pill)] px-4 text-xs font-semibold transition-colors ${
                kind === option
                  ? "bg-[var(--nf-brand-primary)] text-[var(--nf-content-on-brand)]"
                  : "border border-[var(--nf-border-default)] text-[var(--nf-content-secondary)]"
              }`}
            >
              {KIND_LABEL[option]}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        className="nf-field min-h-[92px] w-full resize-y text-[0.97rem] leading-[1.5]"
        value={body}
        maxLength={POST_MAX}
        autoFocus={autoFocus}
        placeholder={isReply ? "Write your reply" : KIND_PLACEHOLDER[kind]}
        onChange={(event) => setBody(event.target.value)}
        aria-label={isReply ? "Your reply" : KIND_LABEL[kind]}
      />

      {!isReply ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {KIND_HINT[kind]}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-3">
        {/* The counter appears only when it starts to matter. A number
            watching you type from the first character is a number telling you
            to stop. */}
        {left < 240 ? (
          <span
            className={`nf-numeric text-xs ${
              left < 0 ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"
            }`}
          >
            {left}
          </span>
        ) : null}
        {onDone ? (
          <button
            type="button"
            className="nf-btn nf-btn--ghost h-10 px-4 text-sm"
            onClick={onDone}
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
        <button type="submit" className="nf-btn nf-btn--primary h-10 px-5 text-sm" disabled={!canSend}>
          {pending ? "Sending" : isReply ? "Reply" : "Post"}
        </button>
      </div>
    </form>
  );
}
