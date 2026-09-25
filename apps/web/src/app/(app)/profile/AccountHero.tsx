"use client";

import { initial } from "@/lib/text/initial";
import "./profile.css";
import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatNumber, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { setAvatar } from "@/lib/profile/actions";
import { setSocialCover } from "@/lib/social/profiles-actions";
import { COVER_MAX_BYTES, COVER_MAX_EDGE } from "@/lib/social/profiles-schema";
import { createClient } from "@/lib/supabase/client";
import { reencodeToJpeg } from "@/components/social/profile/reencode";
import { RemoteImage } from "@/components/ui/RemoteImage";
import { ButtonLink } from "@/components/ui/Button";
import { accountCopy, type BadgeTier } from "./belongings";
import { TierBadge } from "@/components/trust/TierBadge";

/**
 * THE TOP OF YOUR OWN PROFILE, BUILT TO `50E032EA`.
 *
 * Measured off the render (a 658px screen inside the frame, so one CSS pixel at
 * 390 is 1.687 image pixels; every number is in the ledger, section 1): a dusk
 * photograph across the top that fades into the page, a rounded-square glass
 * back control at the upper left and a settings gear at the upper right riding
 * on it (here the gear joins the app header's row and back is dropped; see
 * the note at the gear), then the person. An 88px ROUND face on a lit blue ring (the
 * render puts a small tick on it too; the founder asked for one mark, beside
 * the name, on 25 September 2026), and beside it the name with its tick, the handle,
 * one line of bio, and Followers and Following split by a hairline.
 *
 * Every word and number here is the database's:
 *
 *   name       `profiles.display_name` (first and surname as the fallback)
 *   handle     `social_profiles.handle`
 *   bio        `social_profiles.bio`
 *   counts     `social_profiles.follower_count` and `following_count`, kept by
 *              the `follows_count` trigger (`bump_follow_counts`) on every
 *              follow and unfollow
 *   badge      `public.person_badge.tier` (the one derivation), into
 *              `TierBadge`, which draws nothing for a person without a tier
 *   face       `profiles.avatar_url`
 *   cover      `social_profiles.cover_path`, or the founder's villa plate
 *              when nobody has set one
 *
 * These classes are this surface's own (`nf-pf-*`, in `profile.css`) and not
 * the social layer's. The public page at `/u/[handle]` still wears the social
 * classes in `social.css`, which the social layer owns; the two used to
 * share one set, and every change made for one moved the other.
 *
 * BOTH PHOTOS ARE CHANGED HERE. Tapping the face opens its picker; the
 * "Cover photo" row under the belongings opens the cover's. Both are
 * re-encoded through a canvas before upload, which strips the GPS tag a phone
 * camera writes. A failed re-encode REFUSES the file rather than falling back
 * to the original: both buckets are public.
 */

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
/** The cover picker's id, pressed by the "Cover photo" row in `AccountBody`. */
export const COVER_INPUT_ID = "account-cover-input";
const AVATAR_MAX_EDGE = 512;
const COMPACT: Intl.NumberFormatOptions = { notation: "compact", maximumFractionDigits: 1 };

/** The cover a person has not set yet: the founder's dusk villa over water with the skyline behind it, the same scene `50E032EA` opens on. */
const COVER_PLATE = "/brand/photos/villa-pool-skyline-02.jpg";

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
  badgeTier = null,
  locale,
}: {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  /** Null when this person has not claimed a handle. */
  identity: HeroIdentity | null;
  /** From `public.person_badge`, the one source. Null means no badge. */
  badgeTier?: BadgeTier;
  /**
   * Place and member-since. Accepted for the callers that still pass it; the
   * render draws neither in the header, so both now live in the account rows
   * under the belongings, where nothing is lost.
   */
  metaLine?: { place: string; joined: string };
  /** The locale, NOT a formatter: a function cannot cross into a client component. */
  locale: Locale;
}) {
  const router = useRouter();
  const COPY = accountCopy(locale);
  /* The render writes 12.4K: from ten thousand a count is compact, below
     it every digit shows. The figure itself is always the database's. */
  const formatCount = (value: number) =>
    value >= 10_000 ? formatNumber(value, locale, COMPACT) : formatNumber(value, locale);
  const coverInput = useRef<HTMLInputElement>(null);
  const avatarInput = useRef<HTMLInputElement>(null);

  const [cover, setCover] = useState(identity?.coverUrl ?? "");
  const [avatar, setAvatarState] = useState(avatarUrl);
  const [busy, setBusy] = useState<"cover" | "avatar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shownName = displayName.trim() || email || "Your account";
  const monogram = initial(displayName.trim() || identity?.handle || email);

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
    <header className="nf-pf-hero" data-testid="account-hero">
      {/* ------------------------------------------------------- the cover */}
      <div className="nf-pf-cover">
        {cover ? (
          <RemoteImage
            src={cover}
            alt=""
            width={1200}
            height={400}
            sizes="(max-width: 768px) 100vw, 768px"
            priority
            className="nf-pf-cover__photo"
          />
        ) : (
          <Image
            src={COVER_PLATE}
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="nf-pf-cover__photo nf-pf-cover__photo--plate"
          />
        )}
        {/* The dusk grade and the fade into the page, one layer each. */}
        <span className="nf-pf-cover__grade" aria-hidden="true" />
        <span className="nf-pf-cover__fade" aria-hidden="true" />

        {/*
          ONE ROW OF CONTROLS OVER THE COVER, NOT TWO.

          Members see the app header here (menu, lockup, bell, avatar), and
          the render's back and settings squares stacked under it read as a
          second row of floating buttons. So on a phone the gear takes the
          header's own row, left of the bell, in the header's own control
          (`nf-icon-btn`, 44px), and there is no back: `/profile` is a dock
          destination, and the menu and the dock are the way off it. From 640
          up the cover is a framed band inside the column and the gear sits
          on its upper right. The header itself is shared; a proper slot
          for a page action in it would replace this.
        */}
        <Link
          href="/settings"
          className="nf-icon-btn nf-pf-gear"
          aria-label={COPY.settings}
          data-testid="account-settings-button"
        >
          <UiIcon name="settings-gear" size="md" />
        </Link>
      </div>

      {/* --------------------------------- the person, beside the picture */}
      <div className="nf-pf-id">
        <button
          type="button"
          onClick={() => avatarInput.current?.click()}
          disabled={busy !== null}
          aria-label={avatar ? "Change your photo" : "Add a photo of you"}
          className="nf-pf-avatar"
          data-testid="account-avatar-button"
        >
          <span className="nf-pf-avatar__disc">
            {avatar ? (
              <RemoteImage src={avatar} alt="" width={192} height={192} sizes="88px" />
            ) : (
              <span aria-hidden="true">{monogram}</span>
            )}
          </span>
          {/* ONE MARK, BESIDE THE NAME (the founder, 25 September 2026).
              The person's badge (from `person_badge`) stood on the ring as
              well, so a verified person wore it twice a finger apart. The
              face keeps only the quiet picture mark, which says it is a
              control. */}
          <span className="nf-pf-avatar__badge nf-pf-avatar__badge--quiet" aria-hidden="true">
            <UiIcon name={busy === "avatar" ? "sparkle" : "picture"} size="2xs" />
          </span>
        </button>

        <div className="nf-pf-id__text">
          <h1 className="nf-pf-name" data-badge-tier={badgeTier ?? "none"}>
            <span className="nf-pf-name__text">{shownName}</span>
            {badgeTier ? <TierBadge tier={badgeTier} size={18} className="nf-pf-name__tier" /> : null}
          </h1>
          <p className="nf-pf-handle">{identity ? `@${identity.handle}` : email}</p>

          {identity?.bio ? <p className="nf-pf-bio">{identity.bio}</p> : null}

          {identity ? (
            <div className="nf-pf-counts">
              <Link href={`/u/${identity.handle}/followers`} className="nf-pf-count">
                <span className="nf-pf-count__value nf-numeric">
                  {formatCount(identity.followerCount)}
                </span>
                <span className="nf-pf-count__label">{COPY.followers}</span>
              </Link>
              <span className="nf-pf-counts__rule" aria-hidden="true" />
              <Link href={`/u/${identity.handle}/following`} className="nf-pf-count">
                <span className="nf-pf-count__value nf-numeric">
                  {formatCount(identity.followingCount)}
                </span>
                <span className="nf-pf-count__label">{COPY.following}</span>
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {!identity && (
        <div className="nf-pf-claim">
          <ButtonLink
            href="/u/me/edit"
            variant="primary"
            size="lg"
            full
            data-testid="profile-claim-handle"
          >
            {COPY.claimHandle}
          </ButtonLink>
          <p className="nf-pf-claim__note">{COPY.claimHandleNote}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="nf-pf-error">
          {error}
        </p>
      )}

      {/* The cover's picker. `50E032EA` draws nothing on the cover but back
          and settings, so the control that opens this is the "Cover photo" row
          under the belongings (`COVER_INPUT_ID`), not a third square here. */}
      <input
        ref={coverInput}
        id={COVER_INPUT_ID}
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
