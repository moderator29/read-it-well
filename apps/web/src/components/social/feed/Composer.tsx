"use client";

import { Button } from "@/components/ui/Button";
import { useRef, useState, useTransition, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Segmented } from "@/components/ui/Segmented";
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { loadBrowserClient } from "@/lib/supabase/load-client";
import { attachPostMedia, dropPost, replyToPost } from "@/lib/social/posts-actions";
import { sendOrKeep } from "@/lib/offline/send-or-keep";
import { useClientCopy } from "@/lib/i18n/client-copy";
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
  areaName,
  autoFocus = false,
  initialKind = "GIST",
  onDone,
  fieldRef,
  draft,
  onDraftChange,
}: {
  areaId?: string;
  parentId?: string;
  signedIn: boolean;
  areaName?: string;
  autoFocus?: boolean;
  /** Chosen before the composer opened, by the create ring. */
  initialKind?: ComposableKind;
  onDone?: () => void;
  /** The text field, for a sheet that wants to put first focus on it. */
  fieldRef?: RefObject<HTMLTextAreaElement | null>;
  /** The words, held by the caller. Pass both or neither. */
  draft?: string;
  onDraftChange?: (next: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<ComposableKind>(initialKind);
  /* The words live with the caller when it asks to hold them, so a sheet that
     is closed by a stray drag or Back does not throw a half-written post
     away. Otherwise they are this component's own. */
  const [ownBody, setOwnBody] = useState("");
  const body = draft ?? ownBody;
  const setBody = (next: string) => (onDraftChange ? onDraftChange(next) : setOwnBody(next));
  const [error, setError] = useState<string | null>(null);
  /* V-40: the post was kept for when the signal returns. */
  const [keptNote, setKeptNote] = useState<string | null>(null);
  const OUTBOX = useClientCopy().platform.outbox;
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
      <div className="nf-panel nf-panel--card nf-post p-md text-center">
        <p className="text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
          Sign in to {isReply ? "reply" : `post${areaName ? ` around ${areaName}` : ""}`}.
        </p>
      </div>
    );
  }

  /*
   * There used to be a wall here.
   *
   * `isMember === false` returned "Join this place first and you can post in
   * it", so somebody who opened the app, tapped the plus and wanted to say one
   * sentence was told to go and join a room first. Nothing in the database ever
   * asked for that: `posts.area_id` is nullable, `posts_insert_self` allows a
   * null area outright, and there is no membership check anywhere in the schema.
   * The requirement lived in this component and in one `.uuid()` on a zod field,
   * and between them they made joining a place the price of speaking.
   *
   * It is gone. With a place, the post lands in that place. Without one, it
   * lands on the whole platform, and the line under the box says which.
   */

  if (held) {
    return (
      <div className="nf-panel nf-panel--card nf-post p-md">
        <p className="text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
          It is with us
        </p>
        <p className="mt-2xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-muted)]">
          {POST_COPY.held}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-sm"
          onClick={() => {
            setHeld(false);
            setBody("");
            onDone?.();
          }}
        >
          Write another
        </Button>
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

    /* One refused file refuses only itself. This used to `return` on the
       first bad file, which threw away every picture already prepared in the
       same choice (and leaked their object URLs), so choosing three photos and
       one screenshot too large attached nothing at all. The reason shown is
       the last refusal met. */
    const prepared: Picture[] = [];
    let refusal: string | null = null;
    for (const file of chosen.slice(0, room)) {
      if (!(POST_IMAGE_TYPES as readonly string[]).includes(file.type)) {
        refusal = POST_FAILURE.pictureType;
        continue;
      }
      if (file.size > POST_IMAGE_MAX_BYTES) {
        refusal = POST_FAILURE.pictureTooBig;
        continue;
      }
      const blob = await reencodeToJpeg(file, { maxEdge: POST_IMAGE_MAX_EDGE });
      if (!blob) {
        /* Deliberately not falling back to the original file. */
        refusal = POST_FAILURE.pictureReencode;
        continue;
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

    if (chosen.length > room) refusal = POST_FAILURE.pictureTooMany;
    if (refusal) setError(refusal);
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
      const supabase = await loadBrowserClient();
      if (!supabase) return false;
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
      /* V-40: a new post with no signal and no pictures is kept and posted
         when the signal returns. Replies and pictures need the connection. */
      let result: Awaited<ReturnType<typeof dropPost>>;
      if (parentId) {
        result = await replyToPost({ parentId, body });
      } else if (pictures.length === 0) {
        const fields: { kind: "GIST" | "ASK"; body: string; areaId?: string } = areaId ? { areaId, kind, body } : { kind, body };
        const done = await sendOrKeep("drop_post", fields, (tapKey) => dropPost({ ...fields, tapKey }));
        if (done.state === "kept") {
          setBody("");
          setError(null);
          setKeptNote(OUTBOX.waiting);
          return;
        }
        if (done.state === "not_kept") {
          setError(OUTBOX.couldNotKeep);
          return;
        }
        result = done.result;
      } else {
        result = await dropPost(areaId ? { areaId, kind, body } : { kind, body });
      }

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
      className="nf-panel nf-panel--card nf-post"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend) send();
      }}
    >
      {!isReply ? (
        /*
         * THIS WAS THE TWELFTH WAY TO DRAW A SEGMENTED CONTROL AND IT WORE NO
         * CLASS FROM ANY OF THE ELEVEN.
         *
         * A hand-rolled `role="radiogroup"` of three buttons with the brand
         * fill inlined at the call site. It had NO KEYBOARD HANDLING AT ALL:
         * a radiogroup is meant to move on the arrow keys, and this one did
         * not, so a keyboard user landed on the first option and could reach
         * the others only by leaving the group. It was also `h-9`, a 36px
         * target under the 44pt floor, and at 14px of radius on 36px it sat at
         * 0.389 on the shape watch line.
         *
         * `Segmented` with `semantics="radio"` is the same control done once:
         * roving focus, arrow keys, the measured travelling capsule, the 44px
         * `md` rung, and the selected fill coming from the stylesheet instead
         * of from a ternary in this file.
         */
        <Segmented<ComposableKind>
          className="mb-sm"
          semantics="radio"
          label="What are you posting?"
          options={COMPOSABLE_KINDS.map((option) => ({
            value: option,
            label: KIND_LABEL[option],
          }))}
          value={kind}
          onChange={setKind}
        />
      ) : null}

      <textarea
        ref={fieldRef}
        className="nf-field min-h-[92px] w-full resize-y text-[length:var(--nf-text-body)] leading-[1.5]"
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
                  <UiIcon name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
            {POST_COPY.pictureNote}
          </p>
        </>
      ) : null}

      {/* Where it lands. Nobody should have to guess whether the thing they
          just wrote went to one street or to the whole country, and the answer
          changes with a prop rather than with anything on screen. */}
      {!isReply ? (
        <p
          className="mt-xs flex items-center gap-2xs text-[length:var(--nf-text-overline)] text-[var(--nf-content-secondary)]"
          data-testid="composer-destination"
        >
          <UiIcon name={areaId ? "location" : "compass"} size={16} />
          {areaId && areaName ? `Posting in ${areaName}` : "Posting to everyone on Vallo"}
        </p>
      ) : null}

      {!isReply && pictures.length === 0 ? (
        <p className="mt-xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-muted)]">
          {KIND_HINT[kind]}
        </p>
      ) : null}

      {/* A picture cannot post on its own. `posts_content_chk` requires words,
          a listing, a quote or a payload, so the button would be refused by the
          database and this says why before anybody taps it. */}
      {pictures.length > 0 && body.trim().length === 0 && !strandedPost ? (
        <p className="mt-xs text-[length:var(--nf-text-overline)] leading-relaxed text-[var(--nf-content-secondary)]">
          {POST_COPY.pictureNeedsWords}
        </p>
      ) : null}

      {keptNote && !error ? (
        <p role="status" className="mt-xs nf-caption text-[var(--nf-content-secondary)]" data-testid="composer-waiting">
          {keptNote}
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-xs rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-sm py-xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-primary)]"
        >
          <p className="leading-relaxed">{error}</p>
          {strandedPost ? (
            <div className="mt-xs flex flex-wrap gap-xs">
              <Button variant="primary" size="sm" onClick={retry} disabled={pending}>
                {pending ? "Sending" : "Send the picture again"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
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
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-sm flex items-center justify-end gap-sm">
        <button
          type="button"
          className="nf-post__act me-auto"
          onClick={() => fileInput.current?.click()}
          disabled={pending || Boolean(strandedPost) || pictures.length >= POST_MEDIA_MAX}
          aria-label={POST_COPY.picturePrompt}
        >
          <UiIcon name="picture" />
          {pictures.length > 0 ? (
            <span className="nf-numeric text-[length:var(--nf-text-overline)]">
              {pictures.length}/{POST_MEDIA_MAX}
            </span>
          ) : null}
        </button>

        {/* The counter appears only when it starts to matter. A number
            watching you type from the first character is a number telling you
            to stop. */}
        {left < 240 ? (
          <span
            className={`nf-numeric text-[length:var(--nf-text-overline)] ${
              left < 0 ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"
            }`}
          >
            {left}
          </span>
        ) : null}
        {onDone ? (
          <Button variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancel
          </Button>
        ) : null}
        {/* `nf-composer__send` keeps the brand fill while the field is empty.
            See the rule in social-feed.css: a composer's send is off because
            nobody has typed yet, which is its resting state, not a fault, and
            the platform's flat grey disabled reads as a broken control on the
            one primary the screen has (R1 A26). */}
        <Button type="submit" variant="primary" size="sm" className="nf-composer__send" disabled={!canSend}>
          {pending ? "Sending" : isReply ? "Reply" : "Post"}
        </Button>
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
