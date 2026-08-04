"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setAvatar } from "@/lib/profile/actions";
import { setSocialCover } from "@/lib/social/profiles-actions";
import { COVER_MAX_BYTES, COVER_MAX_EDGE } from "@/lib/social/profiles-schema";
import { createClient } from "@/lib/supabase/client";
import { reencodeToJpeg } from "./reencode";

/**
 * The cover, and the photo of you.
 *
 * Both are re-encoded through a canvas before they are uploaded, which strips
 * every piece of metadata including the GPS tag a phone camera writes. If the
 * re-encode fails for any reason the file is REFUSED rather than uploaded as it
 * came, because a geotagged photo in a public bucket tells the internet where
 * somebody sleeps.
 *
 * The cover belongs to the social profile and lives in `social-covers`. The
 * photo of you does not: it is the one avatar this person has everywhere on the
 * platform, it lives in `avatars`, and a definer trigger projects it onto the
 * social profile whenever it changes. Uploading a second, social-only avatar
 * would be silently undone by that projection on the very next profile save, so
 * this control writes the real one through the account's own action.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_EDGE = 512;

export function ProfilePhotos({
  userId,
  handle,
  coverUrl,
  avatarUrl,
  displayName,
}: {
  userId: string;
  handle: string;
  coverUrl: string;
  avatarUrl: string;
  displayName: string;
}) {
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const [cover, setCover] = useState(coverUrl);
  const [avatar, setAvatarUrl] = useState(avatarUrl);
  const [busy, setBusy] = useState<"cover" | "avatar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const monogram = (displayName || handle).charAt(0).toUpperCase();

  async function prepare(file: File, square: boolean): Promise<Blob | null> {
    if (!ACCEPTED.includes(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return null;
    }
    if (file.size > COVER_MAX_BYTES) {
      setError("That photo is over 10MB. Please choose a smaller one.");
      return null;
    }
    const blob = await reencodeToJpeg(file, {
      maxEdge: square ? AVATAR_MAX_EDGE : COVER_MAX_EDGE,
      square,
    });
    if (!blob) {
      /* Deliberately not falling back to the original file. */
      setError(
        "We could not prepare that photo safely, so it was not uploaded. Try a different one.",
      );
      return null;
    }
    return blob;
  }

  async function onCover(file: File) {
    setError(null);
    setNote(null);
    setBusy("cover");
    try {
      const blob = await prepare(file, false);
      if (!blob) return;

      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const upload = await supabase.storage
        .from("social-covers")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (upload.error) {
        setError("That upload did not go through. Check your connection and try again.");
        return;
      }

      const result = await setSocialCover({ storagePath: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCover(URL.createObjectURL(blob));
      setNote("Your cover is saved.");
      router.refresh();
    } catch {
      setError("We could not read that photo. Try a different one.");
    } finally {
      setBusy(null);
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  async function onAvatar(file: File) {
    setError(null);
    setNote(null);
    setBusy("avatar");
    try {
      const blob = await prepare(file, true);
      if (!blob) return;

      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const upload = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
      if (upload.error) {
        setError("That upload did not go through. Check your connection and try again.");
        return;
      }

      const result = await setAvatar({ storagePath: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAvatarUrl(result.data.avatarUrl);
      setNote("Your photo is saved, here and everywhere else on RentMe.");
      router.refresh();
    } catch {
      setError("We could not read that photo. Try a different one.");
    } finally {
      setBusy(null);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  }

  async function removeCover() {
    setError(null);
    setNote(null);
    setBusy("cover");
    try {
      const result = await setSocialCover({ storagePath: null });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCover("");
      setNote("Your cover is back to the house one.");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="nf-card nf-social-card overflow-hidden">
      <div className="relative h-[7.5rem] sm:h-[9rem]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="nf-social-cover__photo" />
        ) : (
          <div className="nf-social-cover__art" aria-hidden="true" />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />

        <div className="absolute right-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => coverInput.current?.click()}
            disabled={busy !== null}
            className="nf-btn nf-btn--glass px-3 py-2 text-[0.75rem]"
          >
            {busy === "cover" ? "Working" : cover ? "Change cover" : "Add a cover"}
          </button>
          {cover && (
            <button
              type="button"
              onClick={() => void removeCover()}
              disabled={busy !== null}
              className="nf-btn nf-btn--ghost px-3 py-2 text-[0.75rem]"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end gap-3 px-4 pb-4 sm:px-5">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={busy !== null}
          aria-label="Change your photo"
          className="nf-social-avatar -mt-9 cursor-pointer"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" />
          ) : (
            monogram
          )}
        </button>

        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[0.8125rem] font-semibold">
            {busy === "avatar" ? "Saving your photo" : "Your photo"}
          </p>
          <p className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
            This is the same photo you use everywhere on RentMe. You can also change it from{" "}
            <Link href="/profile" className="font-semibold text-[var(--nf-brand-secondary)]">
              your account
            </Link>
            .
          </p>
        </div>
      </div>

      <p className="px-4 pb-4 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)] sm:px-5">
        Photos are re-encoded on your phone before they are uploaded, so the location tag a camera
        writes never leaves it.
      </p>

      {error && (
        <p role="alert" className="px-4 pb-4 text-[0.75rem] text-[var(--nf-state-error)] sm:px-5">
          {error}
        </p>
      )}
      {note && !error && (
        <p role="status" className="px-4 pb-4 text-[0.75rem] text-[var(--nf-state-success)] sm:px-5">
          {note}
        </p>
      )}

      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onCover(file);
        }}
      />
      <input
        ref={avatarInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onAvatar(file);
        }}
      />
    </section>
  );
}
