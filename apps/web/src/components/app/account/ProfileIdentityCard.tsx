"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UiIcon } from "@/design-system/icons/UiIcon";

const NAME_KEY = "nf_profile_name";
const DEFAULT_NAME = "Guest";
const MAX_NAME_LENGTH = 40;

/**
 * Account stats. These are real counters that start at zero, rendered from
 * constants until activity data exists, never inflated numbers.
 */
const STATS = { bookings: 0, saved: 0, reviews: 0 } as const;

/**
 * Identity card for the profile surface.
 *
 * There is no session layer yet, so the display name lives on this device:
 * hydrated from localStorage on mount and written back on every keystroke, so
 * the avatar and heading update in real time while typing. The first render
 * shows the default so server and client markup agree, then the stored name
 * arrives in the mount effect.
 */
export function ProfileIdentityCard({
  labels,
}: {
  labels: { bookings: string; saved: string; reviews: string };
}) {
  const [name, setName] = useState(DEFAULT_NAME);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NAME_KEY);
      if (stored && stored.trim()) setName(stored.trim().slice(0, MAX_NAME_LENGTH));
    } catch {
      // Storage can be unavailable in private browsing. The default stands.
    }
  }, []);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const update = (next: string) => {
    const value = next.slice(0, MAX_NAME_LENGTH);
    setName(value);
    try {
      const clean = value.trim();
      if (clean && clean !== DEFAULT_NAME) window.localStorage.setItem(NAME_KEY, clean);
      else window.localStorage.removeItem(NAME_KEY);
    } catch {
      // Nothing to do, the in-memory value still updates the card.
    }
  };

  const shownName = name.trim() || DEFAULT_NAME;
  const initial = shownName.charAt(0).toUpperCase();

  const stats = [
    { key: "bookings", label: labels.bookings, value: STATS.bookings },
    { key: "saved", label: labels.saved, value: STATS.saved },
    { key: "reviews", label: labels.reviews, value: STATS.reviews },
  ];

  return (
    <section className="nf-card p-5 sm:p-6" aria-label={shownName}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[0_10px_26px_-8px_color-mix(in_oklab,var(--nf-brand-primary)_85%,transparent)]"
          style={{ background: "var(--nf-gradient-brand)" }}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="nf-h3 truncate">{shownName}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Your profile on this device
          </p>
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
          className="nf-rise mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            setEditing(false);
          }}
        >
          <label htmlFor={fieldId} className="nf-label mb-1.5 block">
            Display name
          </label>
          <input
            ref={inputRef}
            id={fieldId}
            type="text"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="nickname"
            placeholder={DEFAULT_NAME}
            onChange={(e) => update(e.target.value)}
            className="nf-field"
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.75rem] text-[var(--nf-content-muted)]">
            <UiIcon name="verified" size={13} className="shrink-0" />
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
