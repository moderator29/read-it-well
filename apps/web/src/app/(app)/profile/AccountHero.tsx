"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { setAvatar } from "@/lib/profile/actions";
import { setSocialCover } from "@/lib/social/profiles-actions";
import { COVER_MAX_BYTES, COVER_MAX_EDGE } from "@/lib/social/profiles-schema";
import { createClient } from "@/lib/supabase/client";
import { reencodeToJpeg } from "@/components/social/profile/reencode";

/**
 * The top of your own account, wearing the same identity as your public page.
 *
 * `/profile` and `/u/[handle]` used to be two different ideas of one person.
 * One had a cover running edge to edge, an avatar on the stride ring and a real
 * follower count; the other had a monogram in a white box and three numbers in
 * a bordered strip. They were not two designs of a screen, they were two
 * people, and only one of them looked like it belonged here.
 *
 * So this is the social header, on the account. Identical classes, identical
 * proportions, deliberately: the cover behind the person, the avatar overlapping
 * its lower edge from below, the name, the handle, the counts. Somebody moving
 * between their account and their page should not be able to feel the seam.
 *
 * **Both photos are changed here, in place.** Neither ever could be from the
 * account page: the avatar lived in a 60px button beside a name, and the cover
 * did not exist at all outside the social profile editor. Tapping either one
 * now opens the picker, which is where anybody would look for it first.
 *
 * Both are re-encoded through a canvas before upload, which strips every piece
 * of metadata including the GPS tag a phone camera writes. A failed re-encode
 * REFUSES the file rather than falling back to the original: both buckets are
 * public, and a geotagged photo in a public bucket tells the internet where
 * somebody sleeps.
 *
 * The cover write needs a claimed handle, because `social_profiles` is where a
 * cover lives. Somebody who has not claimed one is not shown a control that
 * cannot work; they are shown the offer instead.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_EDGE = 512;

export type HeroIdentity = {
  handle: string;
  coverUrl: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  isAgent: boolean;
  bio: string;
};

export function AccountHero({
  userId,
  displayName,
  email,
  avatarUrl,
  identity,
  metaLine,
  locale,
}: {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  /** Null when this person has not claimed a handle. */
  identity: HeroIdentity | null;
  /** Place and member-since, already worded and localised by the page. */
  metaLine: { place: string; joined: string };
  /**
   * The locale, NOT a formatter. See the long note in `AccountBody`: handing a
   * function across the server/client boundary is what made this whole page
   * answer 500 to every signed-in person while every database probe came back
   * clean.
   */
  locale: Locale;
}) {
  const router = useRouter();
  const formatCount = (value: number) => formatNumber(value, locale);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const [cover, setCover] = useState(identity?.coverUrl ?? "");
  const [avatar, setAvatarState] = useState(avatarUrl);
  const [busy, setBusy] = useState<"cover" | "avatar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shownName = displayName.trim() || email || "Your account";
  const monogram = (displayName.trim() || identity?.handle || email || "?")
    .charAt(0)
    .toUpperCase();

  async function prepare(file: File, square: boolean): Promise<Blob | null> {
    setError(null);
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
      setError(
        "We could not prepare that photo safely, so it was not uploaded. Try a different one.",
      );
      return null;
    }
    return blob;
  }

  async function onCover(file: File) {
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
        setError("We could not upload that photo. Check your connection and try again.");
        return;
      }

      const result = await setSocialCover({ storagePath: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Read the URL back off the render rather than guessing it: the action
      // returns the path the database actually stored.
      router.refresh();
      setCover(URL.createObjectURL(blob));
    } catch {
      setError("We could not read that photo. Try a different one.");
    } finally {
      setBusy(null);
      if (coverInput.current) coverInput.current.value = "";
    }
  }

  async function onAvatar(file: File) {
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
        setError("We could not upload that photo. Check your connection and try again.");
        return;
      }

      const result = await setAvatar({ storagePath: path });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAvatarState(result.data.avatarUrl);
      router.refresh();
    } catch {
      setError("We could not read that photo. Try a different one.");
    } finally {
      setBusy(null);
      if (avatarInput.current) avatarInput.current.value = "";
    }
  }

  return (
    <header data-testid="account-hero">
      {/* ------------------------------------------------------- the cover */}
      <div className="nf-social-cover">
        {cover ? (
          /* The bucket is public, so the CDN URL renders without a signed
             request. next/image is skipped exactly as the social header does:
             one image from a host that only exists once the platform keys
             land. */
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="nf-social-cover__photo" />
        ) : (
          <div className="nf-social-cover__art" aria-hidden="true" />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />

        {identity && (
          <div className="nf-social-float nf-social-float--end">
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={busy !== null}
              className="nf-btn nf-btn--glass px-3 py-2 text-[0.75rem]"
              data-testid="account-cover-button"
            >
              <UiIcon name="sparkle" size={16} />
              {busy === "cover" ? "Working" : cover ? "Change cover" : "Add a cover"}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- the person */}
      <div className="nf-social-identity">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={busy !== null}
          aria-label={avatar ? "Change your photo" : "Add a photo of you"}
          className="nf-social-avatar nf-social-avatar--ring cursor-pointer disabled:cursor-wait"
          data-testid="account-avatar-button"
        >
          <span className="nf-social-avatar__disc">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" />
            ) : (
              <span aria-hidden="true">{monogram}</span>
            )}
          </span>
          {/* The pencil sits on the avatar rather than beside it, so the thing
              you tap and the thing that changes are the same object. */}
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-elevated)] text-[var(--nf-content-secondary)]"
          >
            <UiIcon name={busy === "avatar" ? "sparkle" : "settings-gear"} size={12} />
          </span>
        </button>
      </div>

      <div className="nf-social-namerow">
        <div className="min-w-0">
          <h1 className="nf-social-name">
            <span className="truncate-none">{shownName}</span>
            {identity?.isAgent ? (
              <span
                className="nf-social-verified"
                title="A verified Vallo agent"
                aria-label="Verified agent"
              >
                <UiIcon name="verified" size={16} />
              </span>
            ) : null}
          </h1>
          {identity ? (
            <p className="nf-social-handle">@{identity.handle}</p>
          ) : (
            <p className="nf-social-handle">{email}</p>
          )}
        </div>
      </div>

      {/* --------------------------------------------------------- counts */}
      {identity ? (
        <div className="nf-social-counts">
          <Link href={`/u/${identity.handle}/followers`} className="nf-social-count">
            <span className="nf-social-count__value nf-numeric">
              {formatCount(identity.followerCount)}
            </span>
            <span className="nf-social-count__label">Followers</span>
          </Link>
          <span className="nf-social-count__rule" aria-hidden="true" />
          <Link href={`/u/${identity.handle}/following`} className="nf-social-count">
            <span className="nf-social-count__value nf-numeric">
              {formatCount(identity.followingCount)}
            </span>
            <span className="nf-social-count__label">Following</span>
          </Link>
          <span className="nf-social-count__rule" aria-hidden="true" />
          <Link href={`/u/${identity.handle}`} className="nf-social-count">
            <span className="nf-social-count__value nf-numeric">
              {formatCount(identity.postCount)}
            </span>
            <span className="nf-social-count__label">Posts</span>
          </Link>
        </div>
      ) : null}

      {identity?.bio ? <p className="nf-social-bio">{identity.bio}</p> : null}

      {(metaLine.place || metaLine.joined) && (
        <div className="nf-social-meta">
          {metaLine.place && (
            <span>
              <UiIcon name="location" size={16} />
              {metaLine.place}
            </span>
          )}
          {metaLine.joined && (
            <span>
              <UiIcon name="calendar-booking" size={16} />
              {metaLine.joined}
            </span>
          )}
        </div>
      )}

      {/* --------------------------------------------------------- actions
          SMALLER, AND THEY STOP STRETCHING.

          Two full-height buttons at `flex-1` filled the width of a phone, so
          the loudest pair of controls on somebody's own profile were the two
          least urgent things they can do there. They are the compact size now
          and sized to their words at every width: an action row is not a
          toolbar, and a control that grows to fill a row is claiming an
          importance it does not have. The 44pt tap floor is unaffected, which
          is what `nf-btn--sm` exists to guarantee. */}
      <div className="mt-block flex flex-wrap gap-inline">
        {identity ? (
          <>
            <Link
              href={`/u/${identity.handle}/edit`}
              className="nf-btn nf-btn--sm nf-btn--glass"
            >
              <UiIcon name="settings-gear" size={16} />
              Edit profile
            </Link>
            <Link
              href={`/u/${identity.handle}`}
              className="nf-btn nf-btn--sm nf-btn--ghost"
              data-testid="account-public-page"
            >
              <UiIcon name="link" size={16} />
              Your public page
            </Link>
          </>
        ) : (
          <Link href="/u/me/edit" className="nf-btn nf-btn--primary w-full sm:w-auto">
            Claim your handle
          </Link>
        )}
      </div>

      {!identity && (
        <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
          A handle is your address on Vallo. Claim one and this page gets a cover, a
          public page and somewhere for what you write to live.
        </p>
      )}

      <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
        Photos are re-encoded on your phone before they are uploaded, so the location tag a
        camera writes never leaves it.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-[var(--nf-state-error)]">
          {error}
        </p>
      )}

      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onCover(file);
        }}
      />
      <input
        ref={avatarInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onAvatar(file);
        }}
      />
    </header>
  );
}
