"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PostGlyph } from "./PostGlyph";
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { createClient } from "@/lib/supabase/client";
import { attachPostMedia, dropPost, replyToPost } from "@/lib/social/posts-actions";
import { summonBot } from "@/lib/social/bot-actions";
import { mentionsBot } from "@/lib/social/bot-schema";
import {
  COMPOSABLE_KINDS,
  KIND_HINT,
  KIND_LABEL,
  KIND_PLACEHOLDER,
  POST_COPY,
  POST_FAILURE,
  POST_IMAGE_MAX_BYTES,
  POST_IMAGE_MAX_EDGE,
  POST_IMAGE_TYPES,
  POST_MAX,
  POST_MEDIA_BUCKET,
  POST_MEDIA_MAX,
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
 *
 * **Pictures, and the order they force.**
 *
 * A picture's object lives at `<author>/<post>/<file>`, because
 * `private.social_media_access` resolves it back to the post that decides who
 * may see it out of that second folder segment. So the post has to exist before
 * anything is uploaded, and the sequence is: write the post, upload, write the
 * `post_media` rows. A database trigger refuses any other path shape.
 *
 * That order has one consequence worth being honest about, and this component
 * is honest about it: if the upload fails, the words are already up. It says
 * exactly that, keeps the pictures, and offers to send them again to the post
 * that already exists rather than pretending nothing happened or writing the
 * words twice.
 *
 * Every picture is redrawn on the device first, through the same canvas
 * re-encode the listing wizard, the avatar, the cover and the story composer
 * use. A camera photo carries EXIF and on a phone that usually means GPS, and
 * this is a photograph of somebody's own street. A re-encode that fails REFUSES
 * rather than falling back to the original file.
 */

type Picture = {
  /** Stable for React. The object name is a fresh uuid on every upload attempt. */
  key: string;
  blob: Blob;
  preview: string;
  /** Measured AFTER the re-encode, so the row records what was stored. */
  width: number | null;
  height: number | null;
};
export function Composer({
  areaId,
  parentId,
  signedIn,
  isMember,
  areaName,
  autoFocus = false,
  initialKind = "GIST",
  onDone,
}: {
  areaId?: string;
  parentId?: string;
  signedIn: boolean;
  isMember?: boolean;
  areaName?: string;
  autoFocus?: boolean;
  /** Chosen before the composer opened, by the create ring. */
  initialKind?: ComposableKind;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ComposableKind>(initialKind);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  /* The post that landed without its pictures. While this is set, the retry is
     on screen and it sends the same pictures to that same post. */
  const [strandedPost, setStrandedPost] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const isReply = Boolean(parentId);
  const left = POST_MAX - body.length;
  const canSend = body.trim().length > 0 && !pending && !strandedPost;

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

  /**
   * Prepare what somebody chose, on their own device.
   *
   * Nothing is uploaded here. The blobs sit in state until there is a post to
   * hang them on, which is why the whole picture flow costs nothing at all if
   * the person changes their mind before sending.
   */
  async function choose(chosen: File[]) {
    setError(null);
    const room = POST_MEDIA_MAX - pictures.length;
    if (room <= 0) {
      setError(POST_FAILURE.pictureTooMany);
      return;
    }

    const prepared: Picture[] = [];
    for (const file of chosen.slice(0, room)) {
      if (!(POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        setError(POST_FAILURE.pictureType);
        return;
      }
      if (file.size > POST_IMAGE_MAX_BYTES) {
        setError(POST_FAILURE.pictureTooBig);
        return;
      }
      const blob = await reencodeToJpeg(file, { maxEdge: POST_IMAGE_MAX_EDGE });
      if (!blob) {
        /* Deliberately not falling back to the original file. */
        setError(POST_FAILURE.pictureReencode);
        return;
      }
      let width: number | null = null;
      let height: number | null = null;
      try {
        const bitmap = await createImageBitmap(blob);
        width = bitmap.width;
        height = bitmap.height;
        bitmap.close();
      } catch {
        /* A row with no dimensions still renders; the tile just cannot reserve
           its space before the picture arrives. */
      }
      prepared.push({ key: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob), width, height });
    }

    if (chosen.length > room) setError(POST_FAILURE.pictureTooMany);
    setPictures((all) => [...all, ...prepared]);
  }

  function drop(key: string) {
    setPictures((all) => {
      const going = all.find((picture) => picture.key === key);
      if (going) URL.revokeObjectURL(going.preview);
      return all.filter((picture) => picture.key !== key);
    });
  }

  function forget() {
    for (const picture of pictures) URL.revokeObjectURL(picture.preview);
    setPictures([]);
  }

  /**
   * Upload, then write the rows. In that order, and both under the person's own
   * session so the storage policy and RLS are the two things deciding.
   *
   * The object name is a fresh uuid on every attempt rather than the picture's
   * React key. A retry after a half-finished upload would otherwise collide
   * with the object it already stored, and the bucket has no update policy, so
   * an upsert would be refused. What it leaves behind is an object no
   * `post_media` row names, and after the access function was tightened that is
   * unreadable by everybody including the person who uploaded it.
   */
  async function attach(postId: string, items: Picture[]): Promise<boolean> {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const uploaded: { path: string; width: number | null; height: number | null }[] = [];
      for (const picture of items) {
        const path = `${user.id}/${postId}/${crypto.randomUUID()}.jpg`;
        const upload = await supabase.storage
          .from(POST_MEDIA_BUCKET)
          .upload(path, picture.blob, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });
        if (upload.error) return false;
        uploaded.push({ path, width: picture.width, height: picture.height });
      }

      const result = await attachPostMedia({ postId, items: uploaded });
      return result.ok;
    } catch {
      return false;
    }
  }

  const retry = () => {
    if (!strandedPost) return;
    setError(null);
    startTransition(async () => {
      const done = await attach(strandedPost, pictures);
      if (!done) {
        setError(POST_FAILURE.pictureUpload);
        return;
      }
      forget();
      setStrandedPost(null);
      onDone?.();
      router.refresh();
    });
  };

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

      /*
       * The pictures, now that there is a post to put them under. A held post
       * still takes them: it is with a moderator, not gone, and it should carry
       * what it was written with when it goes up.
       */
      if (pictures.length > 0) {
        const done = await attach(result.data.postId, pictures);
        if (!done) {
          setBody("");
          setStrandedPost(result.data.postId);
          setError(POST_COPY.pictureLost);
          router.refresh();
          return;
        }
        forget();
      }

      if (result.data.held) {
        setHeld(true);
        return;
      }

      /*
       * The summon.
       *
       * It runs after the post has landed rather than inside the write, because
       * a model call inside `dropPost` would make every ordinary post wait on an
       * API this product does not need to say a sentence. The post appears
       * immediately, the assistant's reply arrives a moment later on the refresh,
       * and a failed summon can never cost somebody their words: it is already
       * saved by the time this line runs.
       *
       * `summonBot` answers its own refusals as replies, so nothing is shown
       * here. A person who is over their allowance sees the assistant say so in
       * the thread, which is where they were looking.
       */
      const summoned = mentionsBot(body);
      const postId = result.data.postId;

      setBody("");
      onDone?.();
      router.refresh();

      if (summoned) {
        void summonBot({ postId }).then(() => router.refresh());
      }
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

      {pictures.length > 0 ? (
        <>
          <ul className="nf-compose-pics" aria-label="The pictures on this post">
            {pictures.map((picture) => (
              <li key={picture.key} className="nf-compose-pics__item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={picture.preview} alt="" />
                <button
                  type="button"
                  className="nf-compose-pics__drop"
                  onClick={() => drop(picture.key)}
                  disabled={pending || Boolean(strandedPost)}
                  aria-label={POST_COPY.pictureRemove}
                >
                  <PostGlyph name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
            {POST_COPY.pictureNote}
          </p>
        </>
      ) : null}

      {!isReply && pictures.length === 0 ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-muted)]">
          {KIND_HINT[kind]}
        </p>
      ) : null}

      {/* A picture cannot post on its own. `posts_content_chk` requires words,
          a listing, a quote or a payload, so the button would be refused by the
          database and this says why before anybody taps it. */}
      {pictures.length > 0 && body.trim().length === 0 && !strandedPost ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--nf-content-secondary)]">
          {POST_COPY.pictureNeedsWords}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-2 rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2 text-sm text-[var(--nf-content-primary)]"
        >
          <p className="leading-relaxed">{error}</p>
          {strandedPost ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                className="nf-btn nf-btn--primary inline-flex h-9 items-center px-4 text-xs"
                onClick={retry}
                disabled={pending}
              >
                {pending ? "Sending" : "Send the picture again"}
              </button>
              <button
                type="button"
                className="nf-btn nf-btn--ghost inline-flex h-9 items-center px-4 text-xs"
                onClick={() => {
                  forget();
                  setStrandedPost(null);
                  setError(null);
                  onDone?.();
                  router.refresh();
                }}
                disabled={pending}
              >
                Leave it as words
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-3">
        <button
          type="button"
          className="nf-post__act me-auto"
          onClick={() => fileInput.current?.click()}
          disabled={pending || Boolean(strandedPost) || pictures.length >= POST_MEDIA_MAX}
          aria-label={POST_COPY.picturePrompt}
        >
          <PostGlyph name="picture" />
          {pictures.length > 0 ? (
            <span className="nf-numeric text-xs">
              {pictures.length}/{POST_MEDIA_MAX}
            </span>
          ) : null}
        </button>

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

      <input
        ref={fileInput}
        type="file"
        accept={POST_IMAGE_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(event) => {
          const chosen = Array.from(event.target.files ?? []);
          if (chosen.length > 0) void choose(chosen);
          if (fileInput.current) fileInput.current.value = "";
        }}
      />
    </form>
  );
}
