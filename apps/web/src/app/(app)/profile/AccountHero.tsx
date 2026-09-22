"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BackChevron } from "@/components/social/profile/BackChevron";
import { setAvatar } from "@/lib/profile/actions";
import { setSocialCover } from "@/lib/social/profiles-actions";
import { COVER_MAX_BYTES, COVER_MAX_EDGE } from "@/lib/social/profiles-schema";
import { createClient } from "@/lib/supabase/client";
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { RemoteImage } from "@/components/ui/RemoteImage";

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

/**
 * The cover a person has not set yet: the founder's villa plate, compressed
 * and sized through next/image. A photograph rather than the gradient band,
 * because `50E032EA` opens on one and a page that looks finished before
 * anybody has uploaded anything is the whole point of the profile.
 */
const COVER_PLATE = "/brand/photos/villa-pool-skyline-01.jpg";

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
      <div className="nf-social-cover nf-social-cover--profile">
        {cover ? (
          /* The bucket is public, so the CDN URL renders without a signed
             request. next/image is skipped for it exactly as the social header
             does: one image from a host that only exists once the platform
             keys land. The plate below IS optimised: it is ours. */
          <RemoteImage
            src={cover}
            alt=""
            width={1200}
            height={400}
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="nf-social-cover__photo"
          />
        ) : (
          <Image
            src={COVER_PLATE}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="nf-social-cover__plate"
          />
        )}
        <div className="nf-social-cover__scrim" aria-hidden="true" />

        {/* Back at the top left, settings at the top right, both glass
            squares riding on the photograph as the render draws them. */}
        <div className="nf-social-float nf-social-float--start">
          <BackChevron fallback="/home" />
        </div>
        <div className="nf-social-float nf-social-float--end">
          <Link
            href="/settings"
            className="nf-social-round"
            aria-label="Settings"
            data-testid="account-settings-button"
          >
            <UiIcon name="settings-gear" size={20} />
          </Link>
        </div>

        {/* The cover is changed in place through one quiet glass square at
            the foot of the band: the render draws no words on its cover,
            and the square's name says what it does. */}
        {identity && (
          <div className="nf-social-cover__change">
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={busy !== null}
              className="nf-social-round"
              aria-label={busy === "cover" ? "Working" : cover ? "Change cover" : "Add a cover"}
              title={cover ? "Change cover" : "Add a cover"}
              data-testid="account-cover-button"
            >
              <UiIcon name={busy === "cover" ? "sparkle" : "picture"} size={18} />
            </button>
          </div>
        )}
      </div>

      {/* --------------------------------- the person, beside the picture */}
      <div className="nf-profile-identity">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={busy !== null}
          aria-label={avatar ? "Change your photo" : "Add a photo of you"}
          className="nf-profile-avatar"
          data-testid="account-avatar-button"
        >
          <span className="nf-profile-avatar__disc">
            {avatar ? (
              <RemoteImage src={avatar} alt="" width={192} height={192} sizes="96px" />
            ) : (
              <span aria-hidden="true">{monogram}</span>
            )}
          </span>
          {/* The mark at the foot of the ring: the verified shield on an
              APPROVED agent, because that is the one state where a human was
              checked; otherwise the quiet pencil saying the photo is a
              control. */}
          {identity?.isAgent ? (
            <span className="nf-profile-avatar__badge" aria-hidden="true">
              <UiIcon name="verified-badge" size={16} />
            </span>
          ) : (
            <span className="nf-profile-avatar__badge nf-profile-avatar__badge--quiet" aria-hidden="true">
              <UiIcon name={busy === "avatar" ? "sparkle" : "settings-gear"} size={14} />
            </span>
          )}
        </button>

        <div className="nf-profile-text">
          <h1 className="nf-social-name">
            <span className="truncate-none">{shownName}</span>
            {identity?.isAgent ? (
              <span
                className="nf-social-verified"
                title="A verified Vallo agent"
                aria-label="Verified agent"
                role="img"
              >
                <UiIcon name="verified-badge" size={18} />
              </span>
            ) : null}
          </h1>
          {identity ? (
            <p className="nf-social-handle">@{identity.handle}</p>
          ) : (
            <p className="nf-social-handle">{email}</p>
          )}

          {identity?.bio ? <p className="nf-social-bio">{identity.bio}</p> : null}

          {/* Followers and Following, a rule between them, both real routes. */}
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
            </div>
          ) : null}
        </div>
      </div>

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

      {/* ------------------------------------------------------ the actions */}
      <div className="nf-profile-actions">
        {identity ? (
          <>
            <Link href={`/u/${identity.handle}/edit`} className="nf-profile-actions__link">
              <UiIcon name="settings-gear" size={16} />
              Edit profile
            </Link>
            <Link
              href={`/u/${identity.handle}`}
              className="nf-profile-actions__link"
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
        <p className="mt-xs text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
          A handle is your address on Vallo. Claim one and this page gets a cover, a
          public page and somewhere for what you write to live.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-xs text-[length:var(--nf-text-caption)] text-[var(--nf-state-error)]">
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
