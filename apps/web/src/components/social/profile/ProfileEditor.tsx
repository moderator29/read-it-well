"use client";

import { useActionState, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ActionResult } from "@/lib/actions/envelope";
import { saveSocialProfile } from "@/lib/social/profiles-actions";
import type { AreaOption, SocialProfileView } from "@/lib/social/profiles-queries";
import {
  BIO_HELD_DETAIL,
  BIO_HELD_TITLE,
  BIO_MAX,
  CONTACT_POLICIES,
  CONTACT_POLICY_COPY,
  HANDLE_HELP,
  HANDLE_MAX,
  LINK_MAX,
  PIDGIN_COPY,
  PRONOUNS_MAX,
  linkLabel,
  type ContactPolicy,
  type SocialProfileSaved,
} from "@/lib/social/profiles-schema";

/**
 * The profile editor, as a full page.
 *
 * One form, one write, one truth. Every field here maps to a column the
 * database validates itself, so the client's job is to say what is wrong while
 * somebody is typing and then get out of the way. Inputs are controlled, so a
 * rejected save never empties a field: whatever was typed is still there to
 * correct.
 *
 * The handle is the one field that can be refused by a rule the browser cannot
 * know about. Reserved words, anything resembling an official RentMe name and a
 * handle released inside the last 90 days are all refused by a trigger, which
 * hands back a sentence written for a person. Those arrive as a field error on
 * this input, in the trigger's own words.
 *
 * Saving a changed handle changes this page's address, so a successful save
 * moves the browser to the new one. Nobody is left on a URL that now belongs to
 * a profile that no longer exists.
 */
export function ProfileEditor({
  profile,
  initialHandle,
  areas,
}: {
  /** The row being edited, or null when this is a first claim. */
  profile: SocialProfileView | null;
  /** The handle to start from: the person's own, or the one they came to take. */
  initialHandle: string;
  areas: AreaOption[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    ActionResult<SocialProfileSaved> | null,
    FormData
  >(saveSocialProfile, null);

  const [handle, setHandle] = useState(initialHandle);
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [pronouns, setPronouns] = useState(profile?.pronouns ?? "");
  const [link, setLink] = useState(profile ? linkLabel(profile.link) : "");
  const [contactPolicy, setContactPolicy] = useState<ContactPolicy>(
    profile?.contactPolicy ?? "REQUEST",
  );
  const [pidginOk, setPidginOk] = useState(profile?.pidginOk ?? false);
  const [homeAreaId, setHomeAreaId] = useState(profile?.homeAreaId ?? "");

  const handleId = useId();
  const bioId = useId();
  const pronounsId = useId();
  const linkId = useId();
  const areaId = useId();

  const saved = state?.ok ? state.data : null;

  /* A saved handle is this page's address. Move to it, then re-read the server
     tree so every surface showing this person agrees with the database. */
  useEffect(() => {
    if (!saved) return;
    router.replace(`/u/${saved.handle}/edit`);
    router.refresh();
  }, [saved, router]);

  const fieldError = (key: string): string | undefined =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  const bioHeld = saved ? saved.bioStatus === "HELD" : profile?.bioStatus === "HELD";
  const claiming = profile === null;

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {bioHeld && (
        <div
          role="status"
          className="nf-card p-4"
          style={{ borderColor: "color-mix(in oklab, var(--nf-state-warning) 45%, transparent)" }}
        >
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-[var(--nf-state-warning)]">
            <UiIcon name="sparkle" size={15} className="shrink-0" />
            {BIO_HELD_TITLE}
          </p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-secondary)]">
            {BIO_HELD_DETAIL}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------ handle */}
      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-overline">{claiming ? "Claim your handle" : "Your handle"}</h2>
        <label htmlFor={handleId} className="nf-label mt-3">
          Handle
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[1.05rem] top-1/2 -translate-y-1/2 text-[var(--nf-content-muted)]"
          >
            @
          </span>
          <input
            id={handleId}
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/^@/, "").toLowerCase())}
            maxLength={HANDLE_MAX}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
            required
            aria-invalid={fieldError("handle") ? true : undefined}
            aria-describedby={`${handleId}-help`}
            className="nf-field pl-[1.9rem]"
            placeholder="yourname"
          />
        </div>
        <p id={`${handleId}-help`} className="mt-2 text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
          {fieldError("handle") ? (
            <span className="text-[var(--nf-state-error)]">{fieldError("handle")}</span>
          ) : (
            <>
              {HANDLE_HELP} People will find you at rentme.ng/u/{handle || "yourname"}.
              {!claiming && " A handle can be changed once every 30 days."}
            </>
          )}
        </p>
      </section>

      {/* --------------------------------------------------------------- bio */}
      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-overline">About you</h2>

        <label htmlFor={bioId} className="nf-label mt-3">
          Bio
        </label>
        <textarea
          id={bioId}
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={BIO_MAX}
          rows={4}
          aria-invalid={fieldError("bio") ? true : undefined}
          aria-describedby={`${bioId}-help`}
          className="nf-field resize-y"
          placeholder="Where you are, what you know, what you are looking for."
        />
        <p id={`${bioId}-help`} className="mt-2 flex items-start justify-between gap-3 text-[0.75rem] leading-relaxed">
          <span className={fieldError("bio") ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"}>
            {fieldError("bio") ??
              "Never put a phone number or an account number here. Those are held for review."}
          </span>
          <span className="nf-numeric shrink-0 text-[var(--nf-content-muted)]">
            {bio.length}/{BIO_MAX}
          </span>
        </p>

        <label htmlFor={pronounsId} className="nf-label mt-4">
          Pronouns
          <span className="ml-1.5 font-normal text-[var(--nf-content-muted)]">optional</span>
        </label>
        <input
          id={pronounsId}
          name="pronouns"
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          maxLength={PRONOUNS_MAX}
          autoComplete="off"
          aria-invalid={fieldError("pronouns") ? true : undefined}
          className="nf-field"
          placeholder="she/her"
        />
        {fieldError("pronouns") && (
          <p className="mt-2 text-[0.75rem] text-[var(--nf-state-error)]">{fieldError("pronouns")}</p>
        )}

        <label htmlFor={linkId} className="nf-label mt-4">
          Link
          <span className="ml-1.5 font-normal text-[var(--nf-content-muted)]">optional</span>
        </label>
        <input
          id={linkId}
          name="link"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={LINK_MAX}
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="url"
          aria-invalid={fieldError("link") ? true : undefined}
          className="nf-field"
          placeholder="myshop.ng"
        />
        <p className="mt-2 text-[0.75rem] leading-relaxed">
          <span className={fieldError("link") ? "text-[var(--nf-state-error)]" : "text-[var(--nf-content-muted)]"}>
            {fieldError("link") ?? "One place people can find you. We add the https:// for you."}
          </span>
        </p>
      </section>

      {/* -------------------------------------------------------- home area */}
      <section className="nf-card p-4 sm:p-5">
        <h2 className="nf-overline">Where you are</h2>
        <label htmlFor={areaId} className="nf-label mt-3">
          Home area
        </label>
        {areas.length > 0 ? (
          <select
            id={areaId}
            name="homeAreaId"
            value={homeAreaId}
            onChange={(e) => setHomeAreaId(e.target.value)}
            className="nf-field"
          >
            <option value="">Rather not say</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}, {area.city}
              </option>
            ))}
          </select>
        ) : (
          <>
            <input type="hidden" name="homeAreaId" value="" />
            <p className="text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              No places are open yet. When the first areas open you will be able to say which one
              is home, and this is where you set it.
            </p>
          </>
        )}
      </section>

      {/* ------------------------------------------------------- who reaches */}
      <fieldset className="nf-card p-4 sm:p-5">
        <legend className="nf-overline">Who can message you</legend>
        <div className="mt-3 space-y-2">
          {CONTACT_POLICIES.map((policy) => {
            const copy = CONTACT_POLICY_COPY[policy];
            const active = contactPolicy === policy;
            return (
              <label
                key={policy}
                className="flex cursor-pointer items-start gap-3 rounded-[var(--nf-radius-md)] border p-3 transition-colors"
                /*
                 * A brand ring rather than a brand tint. `--nf-brand-primary-soft`
                 * is electric blue mixed at 16 per cent, and over a white card
                 * that lands in the lavender range, which breaks the no purple
                 * rule on paper. The ring says "chosen" in both themes and
                 * cannot drift into another hue.
                 */
                style={{
                  borderColor: active ? "var(--nf-brand-primary)" : "var(--nf-border-subtle)",
                  boxShadow: active ? "inset 0 0 0 1px var(--nf-brand-primary)" : "none",
                }}
              >
                <input
                  type="radio"
                  name="contactPolicy"
                  value={policy}
                  checked={active}
                  onChange={() => setContactPolicy(policy)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--nf-brand-primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-[0.875rem] font-semibold">{copy.title}</span>
                  <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
                    {copy.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-3">
          {/* The hidden field posts first, so an unticked box still sends a
              value and the last one written wins. */}
          <input type="hidden" name="pidginOk" value="off" />
          <input
            type="checkbox"
            name="pidginOk"
            value="on"
            checked={pidginOk}
            onChange={(e) => setPidginOk(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--nf-brand-primary)]"
          />
          <span className="min-w-0">
            <span className="block text-[0.875rem] font-semibold">{PIDGIN_COPY.title}</span>
            <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--nf-content-muted)]">
              {PIDGIN_COPY.detail}
            </span>
          </span>
        </label>
      </fieldset>

      {/* ------------------------------------------------------------ result */}
      {state && !state.ok && (
        <p role="alert" className="text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]">
          {state.error}
        </p>
      )}

      {saved && (
        <div role="status" className="nf-card p-4">
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold text-[var(--nf-state-success)]">
            <UiIcon name="verified" size={15} className="shrink-0" />
            {saved.claimed ? `@${saved.handle} is yours.` : "Your profile is saved."}
          </p>
          <Link
            href={`/u/${saved.handle}`}
            className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--nf-brand-secondary)]"
          >
            View your profile
            <UiIcon name="arrow-right" size={14} />
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2 pb-2 sm:flex-row-reverse">
        <button type="submit" disabled={pending} className="nf-btn nf-btn--primary w-full sm:w-auto">
          {pending ? "Saving" : claiming ? "Claim this handle" : "Save profile"}
        </button>
        {!claiming && (
          <Link href={`/u/${initialHandle}`} className="nf-btn nf-btn--ghost w-full sm:w-auto">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
