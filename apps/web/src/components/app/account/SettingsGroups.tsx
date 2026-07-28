"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, localeMeta, type Locale } from "@naijafinds/i18n";
import { LOCALE_COOKIE } from "@/lib/locale.constants";
import { Icon, type IconName } from "@/design-system/icons/Icon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { Toggle } from "./Toggle";

/* ------------------------------------------------------------- appearance */

const REDUCE_MOTION_KEY = "nf_reduce_motion";

/**
 * Motion preference.
 *
 * Persists to localStorage and stamps `data-reduce-motion="1"` on the root
 * element so stylesheets can calm animations app-wide. Applied on mount too,
 * so the choice survives a reload without waiting for user input.
 */
export function AppearanceCard() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(REDUCE_MOTION_KEY) === "1") {
        setReduceMotion(true);
        document.documentElement.dataset.reduceMotion = "1";
      }
    } catch {
      // Storage unavailable. The system-level media query still applies.
    }
  }, []);

  const change = (next: boolean) => {
    setReduceMotion(next);
    try {
      window.localStorage.setItem(REDUCE_MOTION_KEY, next ? "1" : "0");
    } catch {
      // In-memory state still drives the document attribute below.
    }
    if (next) document.documentElement.dataset.reduceMotion = "1";
    else delete document.documentElement.dataset.reduceMotion;
  };

  return (
    <GroupCard overline="Appearance" icon="settings">
      <Toggle
        checked={reduceMotion}
        onChange={change}
        label="Reduce motion"
        description="Calms entrance animations and hover movement across the app."
      />
    </GroupCard>
  );
}

/* --------------------------------------------------------------- language */

/**
 * Language picker.
 *
 * Writes the locale cookie the server reads, then refreshes the server tree
 * so every string re-renders in the chosen language. Radio semantics because
 * exactly one language is active at a time.
 */
export function LanguageCard({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Locale>(current);

  const choose = (next: Locale) => {
    if (next === selected) return;
    setSelected(next);
    // One year, lax. A language choice holds no personal data.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <GroupCard overline="Language" icon="language">
      <div role="radiogroup" aria-label="App language" className="divide-y divide-[var(--nf-border-subtle)]">
        {LOCALES.map((code) => {
          const active = selected === code;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => choose(code)}
              className="flex w-full cursor-pointer items-center gap-3 py-3.5 text-left transition-opacity first:pt-0 last:pb-0 disabled:cursor-wait disabled:opacity-60"
            >
              <span className="nf-badge w-11 justify-center">{localeMeta[code].short}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[0.9375rem] font-medium ${active ? "text-[var(--nf-electric-300)]" : ""}`}>
                  {localeMeta[code].native}
                </span>
                {localeMeta[code].label !== localeMeta[code].native && (
                  <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">
                    {localeMeta[code].label}
                  </span>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-200 ${
                  active
                    ? "bg-[var(--nf-brand-primary)] shadow-[0_0_10px_color-mix(in_oklab,var(--nf-brand-primary)_80%,transparent)]"
                    : "bg-[color-mix(in_oklab,var(--nf-content-primary)_14%,transparent)]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </GroupCard>
  );
}

/* ---------------------------------------------------------- notifications */

const NOTIFY_PREFS_KEY = "nf_notify_prefs";

type NotifyPrefs = { push: boolean; email: boolean; sms: boolean };

const NOTIFY_DEFAULTS: NotifyPrefs = { push: true, email: true, sms: false };

export function NotificationsCard() {
  const [prefs, setPrefs] = useState<NotifyPrefs>(NOTIFY_DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(NOTIFY_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotifyPrefs>;
      setPrefs({
        push: typeof parsed.push === "boolean" ? parsed.push : NOTIFY_DEFAULTS.push,
        email: typeof parsed.email === "boolean" ? parsed.email : NOTIFY_DEFAULTS.email,
        sms: typeof parsed.sms === "boolean" ? parsed.sms : NOTIFY_DEFAULTS.sms,
      });
    } catch {
      // A malformed value falls back to the defaults above.
    }
  }, []);

  const set = (key: keyof NotifyPrefs) => (value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(NOTIFY_PREFS_KEY, JSON.stringify(next));
      } catch {
        // Storage unavailable, the session keeps the in-memory choice.
      }
      return next;
    });
  };

  return (
    <GroupCard overline="Notifications" icon="notification">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <Toggle
          checked={prefs.push}
          onChange={set("push")}
          label="Push notifications"
          description="Booking updates and replies, straight to this device."
        />
        <Toggle
          checked={prefs.email}
          onChange={set("email")}
          label="Email"
          description="Receipts, confirmations and occasional highlights."
        />
        <Toggle
          checked={prefs.sms}
          onChange={set("sms")}
          label="SMS"
          description="Time-critical booking alerts by text message."
        />
      </div>
    </GroupCard>
  );
}

/* ---------------------------------------------------------------- account */

type AccountPanel = "personal" | "security" | "payment";

/**
 * Account rows that expand in place.
 *
 * Each row opens an inline panel instead of navigating away, so nothing on
 * this screen dead-ends. Field values are client state for now; they connect
 * to the account service once sessions exist.
 */
export function AccountCard() {
  const [open, setOpen] = useState<AccountPanel | null>(null);

  const toggle = (panel: AccountPanel) => setOpen((v) => (v === panel ? null : panel));

  return (
    <GroupCard overline="Account" icon="profile">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <AccountRow
          icon="profile"
          label="Personal details"
          description="Name, email and phone number"
          open={open === "personal"}
          onToggle={() => toggle("personal")}
        >
          <Field label="Full name" type="text" autoComplete="name" placeholder="Your full name" />
          <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" />
          <Field label="Phone number" type="tel" autoComplete="tel" placeholder="+234 800 000 0000" />
          <DoneButton onClick={() => setOpen(null)} />
        </AccountRow>

        <AccountRow
          icon="secure"
          label="Security"
          description="Password and sign-in options"
          open={open === "security"}
          onToggle={() => toggle("security")}
        >
          <Field
            label="Current password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter current password"
          />
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
          <p className="text-[0.75rem] text-[var(--nf-content-muted)]">
            Use at least 8 characters with a mix of letters and numbers.
          </p>
          <DoneButton onClick={() => setOpen(null)} />
        </AccountRow>

        <AccountRow
          icon="wallet"
          label="Payment methods"
          description="Cards for faster checkout"
          open={open === "payment"}
          onToggle={() => toggle("payment")}
        >
          <Field label="Name on card" type="text" autoComplete="cc-name" placeholder="As printed on the card" />
          <Field
            label="Card number"
            type="text"
            autoComplete="cc-number"
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry" type="text" autoComplete="cc-exp" inputMode="numeric" placeholder="MM/YY" />
            <Field label="CVC" type="text" autoComplete="cc-csc" inputMode="numeric" placeholder="123" />
          </div>
          <DoneButton onClick={() => setOpen(null)} />
        </AccountRow>
      </div>
    </GroupCard>
  );
}

function AccountRow({
  icon,
  label,
  description,
  open,
  onToggle,
  children,
}: {
  icon: IconName;
  label: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const panelId = useId();

  return (
    <div className="py-3.5 first:pt-0 last:pb-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
      >
        <span className="block h-7 w-7 shrink-0">
          <Icon name={icon} fill />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-medium">{label}</span>
          <span className="block text-[0.8125rem] text-[var(--nf-content-muted)]">{description}</span>
        </span>
        <UiIcon
          name="chevron-down"
          size={16}
          className={`shrink-0 text-[var(--nf-content-muted)] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <div id={panelId} hidden={!open}>
        {open && (
          <form
            className="nf-rise mt-4 space-y-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] p-4"
            onSubmit={(e) => e.preventDefault()}
          >
            {children}
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  autoComplete,
  placeholder,
  inputMode,
}: {
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  inputMode?: "numeric";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="nf-label mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        placeholder={placeholder}
        className="nf-field"
      />
    </div>
  );
}

function DoneButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="nf-btn nf-btn--glass w-full">
      Done
    </button>
  );
}

/* ------------------------------------------------------------ group shell */

function GroupCard({
  overline,
  icon,
  children,
}: {
  overline: string;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <section className="nf-card p-5 sm:p-6" aria-label={overline}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="block h-6 w-6 shrink-0">
          <Icon name={icon} fill />
        </span>
        <h2 className="nf-overline">{overline}</h2>
      </div>
      {children}
    </section>
  );
}
