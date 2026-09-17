"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import {
  formatSince,
  GUEST_NAME,
  MAX_EMAIL,
  MAX_NAME,
  useDeviceIdentity,
} from "./device-identity";

/**
 * Identity card for the profile surface, before there is an account.
 *
 * This card renders ONLY on the signed-out and could-not-load branches of
 * /profile. The signed-in hero is `AccountHero`, which reads the real
 * profiles row and real counts of that person's bookings, saves and reviews.
 *
 * Everything here is therefore scoped to this device, and says so. It used to
 * claim otherwise, in three ways at once, and all three were false for every
 * single person who ever saw them:
 *
 *   - An activity strip hardcoded to `{ trips: 8, saved: 23, reviews: 5 }`,
 *     told to somebody with no account and so necessarily no trips.
 *   - A "Level 2 · Explorer" badge for a level system this product does not
 *     have, in any table, in any schema, anywhere.
 *   - An unconditional "Verified" badge. Verification is a claim about
 *     identity; there is no session here, so there is nothing to verify
 *     against and no flag that could ever make it true.
 *
 * A count nobody can support is not a placeholder, it is a lie with a number
 * in it. There is no honest figure available before sign-in, so the strip is
 * now the invitation to sign in that makes real figures possible, and the
 * date line describes what it actually measures: when this browser first
 * opened the card, not when anybody joined.
 */
export function ProfileIdentityCard() {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const emailId = useId();

  /*
   * THE HYDRATION EFFECT IS GONE. See `device-identity.ts`.
   *
   * This card and `SignedOutHero` each held the same three values in their own
   * `useState`, filled them from the same three `localStorage` keys in their own
   * mount effect, and declared their own copies of the key names and the clamp
   * lengths. Both can be on screen in one session and neither learned about the
   * other's write.
   *
   * It also formatted the first-seen date WITHOUT a time zone while the hero
   * passed `Africa/Lagos`, so the same stamp could name two different months on
   * two surfaces of the same product. `formatSince` settles that in one place.
   */
  const { identity, save } = useDeviceIdentity();
  const name = identity.name;
  const email = identity.email;
  const since = formatSince(identity.since);

  /* Both editors write on every keystroke, which is what they did before and is
     the right behaviour here: there is no Save button on this card, so a value
     that is not written as it is typed is a value lost by navigating away. */
  const updateName = (next: string) => save({ name: next.slice(0, MAX_NAME) });
  const updateEmail = (next: string) => save({ email: next.slice(0, MAX_EMAIL) });

  const shownName = name.trim() || GUEST_NAME;
  const initial = shownName.charAt(0).toUpperCase();

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <section className="nf-card p-card" aria-label={shownName}>
      <div className="flex items-center gap-group">
        {/* Avatar with gradient ring: brand gradient outside, a hairline of
            surface between, the lit monogram inside. */}
        <span
          aria-hidden="true"
          /* The two rings are HAIRLINES drawn around the monogram, not the
             rhythm between two pieces of content, so they take the 2px optical
             rung rather than a hand-picked 2 and 2.5. */
          className="shrink-0 rounded-full p-3xs shadow-[0_10px_26px_-8px_color-mix(in_oklab,var(--nf-brand-primary)_85%,transparent)]"
          style={{ background: "var(--nf-gradient-brand)" }}
        >
          <span className="block rounded-full bg-[var(--nf-surface-canvas)] p-3xs">
            <span
              className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full text-2xl font-bold text-[var(--nf-content-on-brand)] sm:h-16 sm:w-16"
              style={{ background: "var(--nf-gradient-brand)" }}
            >
              {initial}
            </span>
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="nf-h3 truncate">{shownName}</h2>
          {/* What this date measures is the first time this card mounted in
              this browser. It is not a membership, and it no longer says it
              is: there is no account behind this card by definition. */}
          <p className="mt-row nf-caption text-[var(--nf-content-muted)]">
            {since ? `Saved on this device since ${since}` : "Welcome to Vallo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          /* `.nf-chip` sets the caption tier and the 44px floor itself. */
          className="nf-chip shrink-0 cursor-pointer font-semibold"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <form
          className="nf-rise mt-heading space-y-row"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          <div>
            <label htmlFor={nameId} className="nf-label mb-inline block">
              Display name
            </label>
            <input
              ref={inputRef}
              id={nameId}
              type="text"
              value={name}
              maxLength={MAX_NAME}
              autoComplete="nickname"
              placeholder={GUEST_NAME}
              onChange={(e) => updateName(e.target.value)}
              className="nf-field"
            />
          </div>
          <div>
            <label htmlFor={emailId} className="nf-label mb-inline block">
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              maxLength={MAX_EMAIL}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => updateEmail(e.target.value)}
              className="nf-field"
            />
          </div>
          {/* 12px type and a 12px glyph on the line that tells somebody where
              their name and email are actually kept. Both come up: the caption
              tier is the quietest readable one, and the icon floor is 20. */}
          <p className="flex items-center gap-inline nf-caption text-[var(--nf-content-muted)]">
            <UiIcon name="verified" size={ICON.inline} className="shrink-0" />
            Stored on this device only, until you create an account.
          </p>
        </form>
      )}

      {/* Where the activity strip was. Stays, saves and reviews are real
          counts of real rows, so they arrive with an account and not before;
          `AccountHero` and `AccountBody` render them the moment there is
          one. */}
      {/* NO SECOND BORDER. This was a bordered box inside a card, which is the
          one nesting the surface language has no exceptions to, drawn around a
          prompt that the card's own bottom edge already separates. The rule
          above it is enough, and it is the same hairline a row list uses. */}
      <div className="nf-hairline mt-block pt-block text-center">
        {/* "Trips" is a banned synonym for Stay in `PRODUCT.md` section 7. The
            vocabulary table exists so the product sounds like one product, and
            this card sits two taps from a Bookings row that already says
            stays. */}
        <p className="nf-body font-semibold">Your stays live in your account</p>
        <p className="mx-auto mt-row max-w-sm nf-body-sm leading-relaxed text-[var(--nf-content-secondary)]">
          Sign in and this card shows what you have actually booked, saved and
          reviewed, on every device you use.
        </p>
        <ButtonLink href="/sign-in" variant="primary" size="sm" className="mt-heading">
          Sign in
        </ButtonLink>
      </div>
    </section>
  );
}
