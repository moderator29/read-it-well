"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

const NAME_KEY = "nf_profile_name";
const EMAIL_KEY = "nf_profile_email";
const SINCE_KEY = "nf_member_since";
const DEFAULT_NAME = "Guest";
const MAX_NAME_LENGTH = 40;
const MAX_EMAIL_LENGTH = 80;

/** Activity counters shown in the stats strip. */
const STATS = { trips: 8, saved: 23, reviews: 5 } as const;

/**
 * Identity card for the profile surface.
 *
 * The account hero: avatar with the brand gradient ring, editable display
 * name and email held on this device, the member-since line, and level and
 * verification badges over an activity strip. The first render shows the
 * defaults so server and client markup agree, then stored values arrive in
 * the mount effect. The member-since date is stamped the first time this
 * card ever mounts on a device and read back after that.
 */
export function ProfileIdentityCard({
  labels,
}: {
  labels: { trips: string; saved: string; reviews: string };
}) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [email, setEmail] = useState("");
  const [since, setSince] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameId = useId();
  const emailId = useId();

  useEffect(() => {
    try {
      const storedName = window.localStorage.getItem(NAME_KEY);
      if (storedName && storedName.trim()) setName(storedName.trim().slice(0, MAX_NAME_LENGTH));
      const storedEmail = window.localStorage.getItem(EMAIL_KEY);
      if (storedEmail && storedEmail.trim()) setEmail(storedEmail.trim().slice(0, MAX_EMAIL_LENGTH));

      let stamp = window.localStorage.getItem(SINCE_KEY);
      if (!stamp) {
        stamp = new Date().toISOString();
        window.localStorage.setItem(SINCE_KEY, stamp);
      }
      const date = new Date(stamp);
      if (!Number.isNaN(date.getTime())) {
        setSince(date.toLocaleDateString("en-NG", { month: "long", year: "numeric" }));
      }
    } catch {
      // Storage can be unavailable in private browsing. The defaults stand.
    }
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const updateName = (next: string) => {
    const value = next.slice(0, MAX_NAME_LENGTH);
    setName(value);
    try {
      const clean = value.trim();
      if (clean && clean !== DEFAULT_NAME) window.localStorage.setItem(NAME_KEY, clean);
      else window.localStorage.removeItem(NAME_KEY);
    } catch {
      // The in-memory value still updates the card.
    }
  };

  const updateEmail = (next: string) => {
    const value = next.slice(0, MAX_EMAIL_LENGTH);
    setEmail(value);
    try {
      const clean = value.trim();
      if (clean) window.localStorage.setItem(EMAIL_KEY, clean);
      else window.localStorage.removeItem(EMAIL_KEY);
    } catch {
      // The in-memory value still updates the card.
    }
  };

  const shownName = name.trim() || DEFAULT_NAME;
  const initial = shownName.charAt(0).toUpperCase();

  const stats = [
    { key: "trips", label: labels.trips, value: STATS.trips },
    { key: "saved", label: labels.saved, value: STATS.saved },
    { key: "reviews", label: labels.reviews, value: STATS.reviews },
  ];

  return (
    <section className="nf-card p-5 sm:p-6" aria-label={shownName}>
      <div className="flex items-center gap-4">
        {/* Avatar with gradient ring: brand gradient outside, a hairline of
            surface between, the lit monogram inside. */}
        <span
          aria-hidden="true"
          className="shrink-0 rounded-full p-[2px] shadow-[0_10px_26px_-8px_color-mix(in_oklab,var(--nf-brand-primary)_85%,transparent)]"
          style={{ background: "var(--nf-gradient-brand)" }}
        >
          <span className="block rounded-full bg-[var(--nf-surface-canvas)] p-[2.5px]">
            <span
              className="flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full text-2xl font-bold text-white sm:h-16 sm:w-16"
              style={{ background: "var(--nf-gradient-brand)" }}
            >
              {initial}
            </span>
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="nf-h3 truncate">{shownName}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            {since ? `Member since ${since}` : "Welcome to RentMe"}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="nf-badge nf-badge--neutral">Level 2 · Explorer</span>
            <span className="nf-badge nf-badge--verified">
              <UiIcon name="verified" size={12} className="shrink-0" />
              Verified
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          className="nf-chip shrink-0 cursor-pointer text-[0.8125rem] font-semibold"
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing && (
        <form
          className="nf-rise mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          <div>
            <label htmlFor={nameId} className="nf-label mb-1.5 block">
              Display name
            </label>
            <input
              ref={inputRef}
              id={nameId}
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              autoComplete="nickname"
              placeholder={DEFAULT_NAME}
              onChange={(e) => updateName(e.target.value)}
              className="nf-field"
            />
          </div>
          <div>
            <label htmlFor={emailId} className="nf-label mb-1.5 block">
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              value={email}
              maxLength={MAX_EMAIL_LENGTH}
              autoComplete="email"
              placeholder="you@example.com"
              onChange={(e) => updateEmail(e.target.value)}
              className="nf-field"
            />
          </div>
          <p className="flex items-center gap-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
            <UiIcon name="verified" size={12} className="shrink-0" />
            Stored on this device only, until you create an account.
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
