"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { updateProfileAction, setAvatar, type ProfileSaved } from "@/lib/profile/actions";
import {
  AVATAR_MAX_EDGE,
  MAX_NAME_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_PHONE_LENGTH,
} from "@/lib/profile/schema";
import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/actions/envelope";
import type { ProfileView } from "@/lib/profile/queries";

/**
 * The signed-in identity card and its edit form.
 *
 * This is the account version of the profile hero: the avatar is the person's
 * own photo from the avatars bucket, the name and member-since line come from
 * their profiles row, and the three counters are real counts of their own
 * bookings, saves and reviews read under row level security. Saving posts to
 * updateProfile, which writes the row under the same policy and hands back the
 * new truth, so the card re-renders what the database now holds rather than
 * what the form hoped for.
 *
 * Inputs are controlled, so a rejected save never empties a field: whatever
 * was typed is still there to correct.
 */
export function AccountProfile({
  profile,
  memberSinceLabel,
  labels,
}: {
  profile: ProfileView;
  memberSinceLabel: string;
  labels: { trips: string; saved: string; reviews: string };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<ActionResult<ProfileSaved> | null, FormData>(
    updateProfileAction,
    null,
  );

  const [firstName, setFirstName] = useState(profile.firstName);
  const [surname, setSurname] = useState(profile.surname);
  const [nickname, setNickname] = useState(profile.nickname);
  const [phone, setPhone] = useState(profile.phone);

  const [displayName, setDisplayName] = useState(
    profile.displayName || [profile.firstName, profile.surname].filter(Boolean).join(" "),
  );
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [saved, setSaved] = useState(false);

  const firstId = useId();
  const surnameId = useId();
  const nicknameId = useId();
  const phoneId = useId();

  // A successful save is the moment the card learns the new truth. The server
  // tree is refreshed too, so every other surface showing this name agrees.
  useEffect(() => {
    if (!state?.ok) return;
    const next = state.data;
    setFirstName(next.firstName);
    setSurname(next.surname);
    setNickname(next.nickname);
    setPhone(next.phone);
    setDisplayName(next.displayName);
    setSaved(true);
    setEditing(false);
    router.refresh();
    const timer = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [state, router]);

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  const shownName = displayName.trim() || profile.email || "Your account";
  const initial = shownName.charAt(0).toUpperCase();
  const placeLabel = [profile.place.lgaName, profile.place.stateName].filter(Boolean).join(", ");

  const stats = [
    { key: "trips", label: labels.trips, value: profile.counts.trips },
    { key: "saved", label: labels.saved, value: profile.counts.saved },
    { key: "reviews", label: labels.reviews, value: profile.counts.reviews },
  ];

  return (
    <section className="nf-card p-5 sm:p-6" aria-label={shownName} data-testid="identity-card">
      <div className="flex items-center gap-4">
        <AvatarPicker
          userId={profile.userId}
          avatarUrl={avatarUrl}
          initial={initial}
          onSaved={(url) => {
            setAvatarUrl(url);
            router.refresh();
          }}
        />

        <div className="min-w-0 flex-1">
          <h2 className="nf-h3 truncate">{shownName}</h2>
          <p className="mt-0.5 truncate text-[0.8125rem] text-[var(--nf-content-muted)]">
            {profile.email}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="nf-badge nf-badge--brand">Member since {memberSinceLabel}</span>
            {placeLabel && (
              <span className="nf-badge">
                <UiIcon name="location" size={12} className="shrink-0" />
                {placeLabel}
              </span>
            )}
            {profile.place.occupationName && (
              <span className="nf-badge">{profile.place.occupationName}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="nf-chip shrink-0 cursor-pointer text-[0.8125rem] font-semibold"
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {saved && !editing && (
        <p
          role="status"
          className="nf-rise mt-4 flex items-center gap-2 text-[0.8125rem] text-[var(--nf-state-success)]"
        >
          <UiIcon name="verified" size={16} className="shrink-0" />
          Your profile is saved.
        </p>
      )}

      {editing && (
        <form action={formAction} className="nf-rise mt-4 space-y-3" data-testid="profile-form">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              id={firstId}
              name="firstName"
              label="First name"
              value={firstName}
              onChange={setFirstName}
              error={fieldError("firstName")}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="given-name"
            />
            <Field
              id={surnameId}
              name="surname"
              label="Surname"
              value={surname}
              onChange={setSurname}
              error={fieldError("surname")}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="family-name"
            />
          </div>

          <Field
            id={nicknameId}
            name="nickname"
            label="Nickname (optional)"
            value={nickname}
            onChange={setNickname}
            error={fieldError("nickname")}
            maxLength={MAX_NICKNAME_LENGTH}
            autoComplete="nickname"
            placeholder="What friends call you"
          />

          <Field
            id={phoneId}
            name="phone"
            label="Phone number (optional)"
            value={phone}
            onChange={setPhone}
            error={fieldError("phone")}
            maxLength={MAX_PHONE_LENGTH}
            autoComplete="tel"
            inputMode="tel"
            placeholder="0803 123 4567"
          />

          {/* Where you are lives on its own screen with the local government
              it has to agree with. It used to be a state select here that
              posted the state's NAME into a column keyed by its CODE, so every
              save with a state chosen was refused by the database and the
              person was told only that something had gone wrong. */}
          <Link
            href="/settings/place"
            className="flex items-center gap-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3.5 py-3 text-left"
            data-testid="profile-place-link"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-medium">
                {placeLabel || "Where you are"}
              </span>
              <span className="mt-0.5 block text-[0.75rem] text-[var(--nf-content-muted)]">
                {placeLabel
                  ? "State, local government and what you do"
                  : "Set your state, local government and what you do"}
              </span>
            </span>
            <UiIcon
              name="chevron-down"
              size={16}
              className="shrink-0 -rotate-90 text-[var(--nf-content-muted)]"
            />
          </Link>

          {state && !state.ok && (
            <p
              role="alert"
              className="rounded-[var(--nf-radius-md)] border border-[color-mix(in_oklab,var(--nf-state-error)_45%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]"
            >
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="nf-btn nf-btn--primary w-full">
            {pending ? "Saving..." : "Save profile"}
          </button>
          <p className="text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
            Your name is what hosts see when you message or book. Your phone
            number stays private to you and the platform.
          </p>
        </form>
      )}

      <dl className="mt-5 grid grid-cols-3 divide-x divide-[var(--nf-border-subtle)] rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)]">
        {stats.map((s) => (
          <div key={s.key} className="px-2 py-3 text-center">
            <dd className="nf-numeric text-lg font-bold leading-none">{s.value}</dd>
            <dt className="mt-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* --------------------------------------------------------------- avatar work */

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Avatar picker.
 *
 * The photo is downscaled to a square in the browser before it ever leaves the
 * phone: a 4MB camera shot becomes roughly 40KB, which matters a great deal on
 * a metered 3G connection. The upload goes straight to the avatars bucket under
 * the person's own folder, which is the only place storage policy lets them
 * write, and the returned path is then recorded on the profile row.
 */
function AvatarPicker({
  userId,
  avatarUrl,
  initial,
  onSaved,
}: {
  userId: string;
  avatarUrl: string;
  initial: string;
  onSaved: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (file: File) => {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Choose a JPG, PNG or WebP photo.");
      return;
    }

    setBusy(true);
    try {
      const blob = await downscaleToSquare(file, AVATAR_MAX_EDGE);
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
      onSaved(result.data.avatarUrl);
    } catch {
      setError("We could not read that photo. Try a different one.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Change your profile photo"
        className="relative block cursor-pointer rounded-full p-[2px] shadow-[0_10px_26px_-8px_color-mix(in_oklab,var(--nf-brand-primary)_85%,transparent)] disabled:cursor-wait"
        style={{ background: "var(--nf-gradient-brand)" }}
      >
        <span className="block rounded-full bg-[var(--nf-surface-canvas)] p-[2.5px]">
          {avatarUrl ? (
            // The bucket is public, so the CDN URL renders without a signed
            // request. next/image is skipped deliberately: this is one small
            // square from a domain that only exists once envs land.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={60}
              height={60}
              className="h-[3.75rem] w-[3.75rem] rounded-full object-cover sm:h-16 sm:w-16"
            />
          ) : (
            <span
              className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full text-2xl font-bold text-white sm:h-16 sm:w-16"
              style={{ background: "var(--nf-gradient-brand)" }}
            >
              {initial}
            </span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--nf-border-subtle)] bg-[var(--nf-surface-elevated)]"
        >
          <UiIcon name={busy ? "sparkle" : "user"} size={12} />
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void choose(file);
        }}
      />

      {error && (
        <p role="alert" className="mt-1.5 max-w-[9rem] text-[0.6875rem] leading-snug text-[var(--nf-state-error)]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Load a picked file into an image element, cleaning up its object URL. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The photo could not be read."));
    };
    img.src = url;
  });
}

/** Centre-crop to a square, scale to at most `edge` pixels, encode as JPEG. */
async function downscaleToSquare(file: File, edge: number): Promise<Blob> {
  const img = await loadImage(file);
  const source = Math.min(img.naturalWidth, img.naturalHeight);
  if (source === 0) throw new Error("The photo has no pixels.");

  const size = Math.min(edge, source);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot resize the photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    (img.naturalWidth - source) / 2,
    (img.naturalHeight - source) / 2,
    source,
    source,
    0,
    0,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The photo could not be prepared."))),
      "image/jpeg",
      0.82,
    );
  });
}

/* ------------------------------------------------------------- shared field */

function Field({
  id,
  name,
  label,
  value,
  onChange,
  error,
  maxLength,
  autoComplete,
  inputMode,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string;
  maxLength: number;
  autoComplete?: string;
  inputMode?: "tel" | "text";
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="nf-label mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        maxLength={maxLength}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        className="nf-field"
      />
      {error && <p className="mt-1.5 text-[0.75rem] text-[var(--nf-state-error)]">{error}</p>}
    </div>
  );
}
