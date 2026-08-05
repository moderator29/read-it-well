"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { createClient } from "@/lib/supabase/client";
import { publishStory } from "@/lib/social/stories-actions";
import {
  STORY_COPY,
  STORY_FAILURE,
  STORY_HEADLINE_MAX,
  STORY_HEADLINE_MIN,
  STORY_IMAGE_MAX_BYTES,
  STORY_IMAGE_MAX_EDGE,
  STORY_PLACE_MAX,
  STORY_STANDFIRST_MAX,
} from "@/lib/social/stories-schema";

/**
 * Writing a story.
 *
 * Picture, headline, opening line, place, publish. In that order, because the
 * picture is the thing that decides whether the story gets read and choosing it
 * first is what makes the rest feel like captioning rather than filling in a
 * form.
 *
 * **The picture is re-encoded on the phone before it is uploaded**, which
 * strips the GPS tag a camera writes, and a failure REFUSES rather than falling
 * back to the original file. A story is a photograph of a real place, usually
 * somebody's own street, so this is the one rule in the feature with no
 * exception. The same technique is already used by the listing wizard, the
 * account avatar and the profile cover.
 *
 * The upload happens here and the row is written by the server action, in that
 * order, so a story never exists without the object it points at. The reverse
 * ordering would leave a row rendering a broken image.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function StoryComposer({
  areas,
  userId,
  signedIn,
}: {
  areas: { id: string; name: string; city: string }[];
  userId: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [headline, setHeadline] = useState("");
  const [standfirst, setStandfirst] = useState("");
  const [place, setPlace] = useState("");
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!signedIn || !userId) {
    return (
      <div className="nf-card nf-social-card p-7 text-center">
        <div className="mx-auto w-fit">
          <BrandIcon name="camera" size={56} />
        </div>
        <h2 className="nf-h3 mt-4 text-[1.05rem]">Sign in to write a story</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          A story is a picture, a headline and a line or two about a place. It
          stays up, so it needs to belong to somebody.
        </p>
        <Link href="/sign-in" className="nf-btn nf-btn--primary mt-6">
          Sign in
        </Link>
      </div>
    );
  }

  if (areas.length === 0) {
    return (
      <div className="nf-card nf-social-card p-7 text-center">
        <div className="mx-auto w-fit">
          <BrandIcon name="pin-map" size={56} />
        </div>
        <h2 className="nf-h3 mt-4 text-[1.05rem]">A story belongs to a place</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          You are not in any place yet. Join one and you can write about it
          straight away.
        </p>
        {/* The directory, because being in no place is what this state is
            about and only the directory can end it. */}
        <Link href="/around/manage" className="nf-btn nf-btn--primary mt-6">
          Find a place
        </Link>
      </div>
    );
  }

  if (held) {
    return (
      <div className="nf-card nf-social-card p-7 text-center">
        <div className="mx-auto w-fit">
          <BrandIcon name="doc-shield" size={56} />
        </div>
        <h2 className="nf-h3 mt-4 text-[1.05rem]">It is with us</h2>
        <p className="mx-auto mt-2.5 max-w-sm text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
          {STORY_COPY.held}
        </p>
        <Link href="/around" className="nf-btn nf-btn--primary mt-6">
          Back to Around
        </Link>
      </div>
    );
  }

  async function choose(file: File) {
    setError(null);
    if (!ACCEPTED.includes(file.type)) {
      setError(STORY_FAILURE.wrongType);
      return;
    }
    if (file.size > STORY_IMAGE_MAX_BYTES) {
      setError(STORY_FAILURE.tooBig);
      return;
    }
    const prepared = await reencodeToJpeg(file, { maxEdge: STORY_IMAGE_MAX_EDGE });
    if (!prepared) {
      /* Deliberately not falling back to the original file. */
      setError(STORY_FAILURE.reencode);
      return;
    }
    /* Measured after the re-encode, so the row records the pixels that were
       actually stored rather than the ones the camera produced. */
    try {
      const bitmap = await createImageBitmap(prepared);
      setSize({ width: bitmap.width, height: bitmap.height });
      bitmap.close();
    } catch {
      setSize(null);
    }
    setBlob(prepared);
    setPreview(URL.createObjectURL(prepared));
  }

  /* The picture and the headline are the story. A standfirst is optional,
     because a photograph with a good headline is already a piece. */
  const canPublish =
    Boolean(blob) && headline.trim().length >= STORY_HEADLINE_MIN && !pending;

  const publish = () => {
    if (!blob || !userId) {
      setError(STORY_COPY.needsImage);
      return;
    }
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      /* The post id is not known yet, so the object goes under a fresh uuid in
         the person's own folder. The bucket's insert policy only checks the
         first path segment; the read policy resolves the post id out of the
         second, which the server action fills in when it writes the media row. */
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const upload = await supabase.storage
        .from("social-media")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (upload.error) {
        setError(STORY_FAILURE.upload);
        return;
      }

      const result = await publishStory({
        areaId,
        headline: headline.trim(),
        standfirst: standfirst.trim(),
        placeLabel: place.trim(),
        imagePath: path,
        ...(size ? { width: size.width, height: size.height } : {}),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.held) {
        setHeld(true);
        return;
      }
      router.push(`/stories/${result.data.storyId}`);
    });
  };

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canPublish) publish();
      }}
    >
      {/* ------------------------------------------------------ the picture */}
      <button
        type="button"
        onClick={() => fileInput.current?.click()}
        className={`nf-story-pick${preview ? " nf-story-pick--filled" : ""}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="The picture you chose" />
        ) : (
          <span className="nf-story-pick__prompt">
            <BrandIcon name="camera" size={48} />
            <span className="nf-story-pick__label">{STORY_COPY.imagePrompt}</span>
            <span className="nf-story-pick__note">{STORY_COPY.imageNote}</span>
          </span>
        )}
      </button>
      {preview ? (
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="-mt-3 self-start text-[0.8125rem] font-semibold text-[var(--nf-brand-secondary)]"
        >
          Choose a different picture
        </button>
      ) : null}

      {/* ----------------------------------------------------- the headline */}
      <label className="block">
        <span className="nf-overline">Headline</span>
        <textarea
          className="nf-field mt-2 w-full resize-none text-[1.25rem] font-bold leading-tight tracking-[-0.02em]"
          rows={2}
          value={headline}
          maxLength={STORY_HEADLINE_MAX}
          placeholder={STORY_COPY.headlinePlaceholder}
          onChange={(event) => setHeadline(event.target.value)}
        />
      </label>

      <label className="block">
        <span className="nf-overline">The opening paragraph</span>
        <textarea
          className="nf-field mt-2 min-h-[110px] w-full resize-y text-[0.97rem] leading-relaxed"
          value={standfirst}
          maxLength={STORY_STANDFIRST_MAX}
          placeholder={STORY_COPY.standfirstPlaceholder}
          onChange={(event) => setStandfirst(event.target.value)}
        />
      </label>

      <label className="block">
        <span className="nf-overline">Where it happened</span>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute inset-y-0 start-3 grid place-items-center text-[var(--nf-content-muted)]">
            <UiIcon name="location" size={16} />
          </span>
          <input
            className="nf-field w-full ps-10"
            value={place}
            maxLength={STORY_PLACE_MAX}
            placeholder={STORY_COPY.placePlaceholder}
            onChange={(event) => setPlace(event.target.value)}
          />
        </div>
      </label>

      {areas.length > 1 ? (
        <label className="block">
          <span className="nf-overline">Which place is it about</span>
          <select
            className="nf-field mt-2 w-full"
            value={areaId}
            onChange={(event) => setAreaId(event.target.value)}
          >
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                Around {area.name}, {area.city}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--nf-radius-md)] border border-[var(--nf-state-error)] bg-[var(--nf-state-error-surface)] px-3 py-2.5 text-sm leading-relaxed text-[var(--nf-content-primary)]"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" className="nf-btn nf-btn--primary w-full" disabled={!canPublish}>
        {pending ? STORY_COPY.publishing : STORY_COPY.publish}
      </button>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void choose(file);
          if (fileInput.current) fileInput.current.value = "";
        }}
      />
    </form>
  );
}
