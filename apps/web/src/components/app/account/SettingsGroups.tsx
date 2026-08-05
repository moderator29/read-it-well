"use client";

import { useEffect, useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LOCALES, localeMeta, type Locale } from "@naijafinds/i18n";
import { LOCALE_COOKIE } from "@/lib/locale.constants";
import { NIGERIAN_STATES } from "@/lib/data/nigeria";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import { Button } from "@/components/ui/Button";
import { Toggle } from "./Toggle";
import {
  applyReduceMotion,
  applyTextSize,
  applyTheme,
  readThemeChoice,
  useNfSettings,
  type TextSize,
  type ThemeChoice,
} from "./settings-store";

/* ------------------------------------------------------------- appearance */

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: "s", label: "Small" },
  { value: "m", label: "Medium" },
  { value: "l", label: "Large" },
];

/**
 * Appearance: theme, motion and text size.
 *
 * Theme mirrors the mechanism the root layout already uses (`nf_theme` plus
 * `data-theme` on the root), so this control and the header toggle always
 * agree. Text size scales the root font size, which every rem measure in the
 * app follows. All three apply instantly and persist on this device.
 */
export function AppearanceCard() {
  const { settings, set } = useNfSettings();
  // Dark is the platform default, so that is what this shows selected until the
  // effect below reads whatever this device actually chose.
  const [theme, setTheme] = useState<ThemeChoice>("dark");

  useEffect(() => {
    setTheme(readThemeChoice());
    try {
      // Migrate the flag earlier builds stored on its own key.
      if (window.localStorage.getItem("nf_reduce_motion") === "1") set("reduceMotion", true);
    } catch {
      // Storage unavailable: the settings document already has the answer.
    }
  }, [set]);

  useEffect(() => {
    applyTextSize(settings.textSize);
  }, [settings.textSize]);

  useEffect(() => {
    if (settings.reduceMotion) document.documentElement.dataset.reduceMotion = "1";
    else delete document.documentElement.dataset.reduceMotion;
  }, [settings.reduceMotion]);

  const chooseTheme = (next: ThemeChoice) => {
    setTheme(next);
    applyTheme(next);
  };

  const changeMotion = (next: boolean) => {
    set("reduceMotion", next);
    applyReduceMotion(next);
  };

  return (
    <GroupCard overline="Appearance" icon="doc-shield">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <SegmentedRow
          label="Theme"
          description="System follows this device. Dark is the designed default."
          options={THEME_OPTIONS}
          value={theme}
          onChange={chooseTheme}
        />
        <SegmentedRow
          label="Text size"
          description="Scales reading text across the whole app."
          options={TEXT_SIZES}
          value={settings.textSize}
          onChange={(v) => set("textSize", v)}
        />
        <Toggle
          checked={settings.reduceMotion}
          onChange={changeMotion}
          label="Reduce motion"
          description="Calms entrance animations and hover movement across the app."
        />
      </div>
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
    <GroupCard overline="Language" icon="globe-pin">
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
              className="flex min-h-11 w-full cursor-pointer items-center gap-4 py-2.5 text-left transition-opacity disabled:cursor-wait disabled:opacity-60"
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

type NotifyKey = "notifyPush" | "notifyEmail" | "notifySms" | "notifyWhatsapp";

export function NotificationsCard() {
  const { settings, set } = useNfSettings();

  const row = (key: NotifyKey, label: string, description: string) => (
    <Toggle
      checked={settings[key]}
      onChange={(v) => set(key, v)}
      label={label}
      description={description}
    />
  );

  return (
    <GroupCard overline="Notifications" icon="bell-alert">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        {row("notifyPush", "Push notifications", "Booking updates and replies, straight to this device.")}
        {row("notifyEmail", "Email", "Receipts, confirmations and occasional highlights.")}
        {row("notifySms", "SMS", "Time-critical booking alerts by text message.")}
        {row("notifyWhatsapp", "WhatsApp", "Booking confirmations and host replies on WhatsApp.")}
      </div>
    </GroupCard>
  );
}

/* ---------------------------------------------------------------- privacy */

export function PrivacyCard() {
  const { settings, set } = useNfSettings();

  return (
    <GroupCard overline="Privacy" icon="shield-lock">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <SegmentedRow
          label="Profile visibility"
          description="Who can see your name and reviews on listings."
          options={[
            { value: "everyone", label: "Everyone" },
            { value: "private", label: "Only me" },
          ]}
          value={settings.profileVisibility}
          onChange={(v) => set("profileVisibility", v)}
        />
        <Toggle
          checked={settings.readReceipts}
          onChange={(v) => set("readReceipts", v)}
          label="Read receipts"
          description="Let hosts see when you have read their messages."
        />
        <Toggle
          checked={settings.personalisedRecs}
          onChange={(v) => set("personalisedRecs", v)}
          label="Personalised recommendations"
          description="Use your searches and saves to rank places you will like."
        />
      </div>
    </GroupCard>
  );
}

/* ----------------------------------------------------------------- search */

export function SearchCard() {
  const { settings, set } = useNfSettings();
  const cityId = useId();

  return (
    <GroupCard overline="Search" icon="home-search">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <div className="py-2.5">
          <label htmlFor={cityId} className="block text-[0.9375rem] font-medium">
            Default search area
          </label>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Search opens here first. You can always look anywhere.
          </p>
          <select
            id={cityId}
            value={settings.defaultCity}
            onChange={(e) => set("defaultCity", e.target.value)}
            className="nf-field mt-2.5"
          >
            <option value="" style={{ background: "var(--nf-surface-elevated)" }}>
              All of Nigeria
            </option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s} style={{ background: "var(--nf-surface-elevated)" }}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-medium">Currency</p>
            <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
              Every price across RentMe is shown in Naira.
            </p>
          </div>
          <span className="nf-badge shrink-0">
            <span className="nf-numeric">₦</span> NGN
          </span>
        </div>

        <SegmentedRow
          label="Map distances"
          description="Units for distances on maps and listing cards."
          options={[
            { value: "km", label: "Kilometres" },
            { value: "mi", label: "Miles" },
          ]}
          value={settings.distanceUnit}
          onChange={(v) => set("distanceUnit", v)}
        />
      </div>
    </GroupCard>
  );
}

/* --------------------------------------------------------------- security */

/**
 * Security: the app lock preference plus a truthful view of sessions. There
 * is exactly one session today, this device, so that is what the list shows.
 * Sign out everywhere is wired and says plainly when it takes effect.
 */
export function SecurityCard() {
  const { settings, set } = useNfSettings();
  const [device, setDevice] = useState("This device");
  const [signOutNote, setSignOutNote] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = /edg\//i.test(ua)
      ? "Edge"
      : /opr\//i.test(ua)
        ? "Opera"
        : /chrome|crios/i.test(ua)
          ? "Chrome"
          : /firefox|fxios/i.test(ua)
            ? "Firefox"
            : /safari/i.test(ua)
              ? "Safari"
              : "Browser";
    const os = /android/i.test(ua)
      ? "Android"
      : /iphone|ipad|ipod/i.test(ua)
        ? "iOS"
        : /mac os/i.test(ua)
          ? "macOS"
          : /windows/i.test(ua)
            ? "Windows"
            : /linux/i.test(ua)
              ? "Linux"
              : "this device";
    setDevice(`${browser} on ${os}`);
  }, []);

  return (
    <GroupCard overline="Security" icon="shield-lock">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <Toggle
          checked={settings.appLock}
          onChange={(v) => set("appLock", v)}
          label="Biometric app lock"
          description="Ask for fingerprint or face unlock when the app opens, on devices that support it."
        />

        <div className="py-2.5">
          <p className="text-[0.9375rem] font-medium">Active sessions</p>
          <div className="mt-2 flex items-center gap-3 rounded-[var(--nf-radius-md)] border border-[var(--nf-border-subtle)] px-3.5 py-3">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--nf-state-success)] shadow-[0_0_8px_color-mix(in_oklab,var(--nf-state-success)_70%,transparent)]"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-medium">{device}</span>
              <span className="block text-[0.75rem] text-[var(--nf-content-muted)]">
                Current session, active now
              </span>
            </span>
            <span className="nf-badge nf-badge--neutral shrink-0">This device</span>
          </div>
        </div>

        <div className="py-2.5">
          <Button variant="secondary" full onClick={() => setSignOutNote(true)}>
            Sign out everywhere
          </Button>
          {signOutNote && (
            <p role="status" className="nf-rise mt-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              This is your only session, so there is nothing else to sign out.
              Once accounts launch, this control ends every session on every
              device at once.
            </p>
          )}
        </div>
      </div>
    </GroupCard>
  );
}

/* ------------------------------------------------------------------- data */

/**
 * Data: an export request that says exactly where it stands, and a working
 * clear-out that removes every RentMe key from this device and reloads.
 */
export function DataCard() {
  const [exportNote, setExportNote] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const clearLocalData = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    try {
      const doomed: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith("nf_")) doomed.push(key);
      }
      doomed.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Storage unavailable: nothing was held there to begin with.
    }
    window.location.reload();
  };

  return (
    <GroupCard overline="Your data" icon="wallet-secure">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <div className="py-2.5">
          <p className="text-[0.9375rem] font-medium">Download my data</p>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            A copy of everything RentMe holds about you.
          </p>
          <Button variant="secondary" full className="mt-2.5" onClick={() => setExportNote(true)}>
            Request my data
          </Button>
          {exportNote && (
            <p role="status" className="nf-rise mt-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
              Right now everything RentMe knows about you lives in this
              browser, and nothing has left this device. Full data export ships
              with the launch release.
            </p>
          )}
        </div>

        <div className="py-2.5">
          <p className="text-[0.9375rem] font-medium">Clear local data</p>
          <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">
            Removes your profile name, preferences and saved conversations from
            this device, then reloads.
          </p>
          <Button
            variant={confirmClear ? "dangerQuiet" : "secondary"}
            full
            className="mt-2.5"
            onClick={clearLocalData}
          >
            {confirmClear ? "Tap again to confirm" : "Clear local data"}
          </Button>
        </div>
      </div>
    </GroupCard>
  );
}

/* --------------------------------------------------------- shared controls */

/**
 * Segmented single-choice row. Real radio semantics so assistive tech
 * announces the group and the checked option, with the platform chip visual.
 */
function SegmentedRow<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  const labelId = useId();

  return (
    <div className="py-2.5">
      <p id={labelId} className="text-[0.9375rem] font-medium">
        {label}
      </p>
      {description && (
        <p className="mt-0.5 text-[0.8125rem] text-[var(--nf-content-muted)]">{description}</p>
      )}
      <div role="radiogroup" aria-labelledby={labelId} className="mt-2.5 flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`nf-chip cursor-pointer ${active ? "nf-chip--active" : ""}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ group shell */

export function GroupCard({
  overline,
  icon: _icon,
  children,
}: {
  overline: string;
  /**
   * Retained so the twelve call sites keep compiling, and because the grouping
   * it encodes is still meaningful - but deliberately NOT painted. The
   * reference puts nothing beside a group label, and a 44px 3D tile there was
   * the single biggest source of the vertical space the owner asked to remove.
   * Underscore-prefixed so lint agrees it is unused on purpose.
   */
  icon?: BrandIconName;
  children: React.ReactNode;
}) {
  return (
    /*
     * The settings group, rebuilt to the supplied reference.
     *
     * It used to be a `p-6` card whose header carried a 44px 3D icon tile and a
     * `mb-4` gap before the first row. Three sections of that and the screen is
     * mostly padding: the owner's note was that there is "too much space before
     * the next line of settings", and the header block was most of it.
     *
     * The reference does two things differently. The group label sits OUTSIDE
     * the container as quiet small-caps text, so it costs one line rather than a
     * padded row with an icon in it. And the container itself carries no padding
     * at all - the rows own their own, separated by hairlines, which is what
     * makes a list of settings read as one object instead of a stack of cards.
     *
     * The per-section 3D icon is dropped entirely. At 44px it was the loudest
     * thing in a header whose job is to whisper, and the row icons below already
     * say what each line is.
     */
    <section aria-label={overline}>
      <h2 className="nf-overline mb-2 px-1">{overline}</h2>
      <div className="nf-card overflow-hidden p-0">
        <div className="divide-y divide-[var(--nf-border-subtle)] px-4">{children}</div>
      </div>
    </section>
  );
}

/**
 * A settings row: icon, label, optional trailing value, optional chevron.
 *
 * The shape every line in the reference takes. The trailing value is stated on
 * the row itself - "Free Plan", "English", "System" - rather than hidden one tap
 * away, which is what lets someone read their whole configuration by scrolling
 * rather than by opening every row in turn.
 */
export function SettingsRow({
  icon,
  label,
  value,
  href,
  onClick,
  trailing,
  destructive = false,
}: {
  icon: UiIconName;
  label: string;
  /** Stated inline, muted. Omit for rows that only navigate. */
  value?: string;
  href?: string;
  onClick?: () => void;
  /** A control that lives on the row itself, e.g. a Switch. Suppresses the chevron. */
  trailing?: React.ReactNode;
  destructive?: boolean;
}) {
  const body = (
    <>
      <UiIcon
        name={icon}
        size={20}
        className={
          destructive ? "shrink-0 text-[var(--nf-state-error)]" : "shrink-0 opacity-70"
        }
      />
      <span
        className={`min-w-0 flex-1 truncate text-[0.9375rem] font-medium ${
          destructive ? "text-[var(--nf-state-error)]" : ""
        }`}
      >
        {label}
      </span>
      {value ? (
        <span className="shrink-0 truncate text-[0.875rem] text-[var(--nf-content-muted)]">
          {value}
        </span>
      ) : null}
      {trailing ??
        (href || onClick ? (
          <UiIcon name="chevron-down" size={16} className="-rotate-90 shrink-0 opacity-40" />
        ) : null)}
    </>
  );

  /* 52px: the reference's row height. Tall enough to clear 44pt with the
     hairlines counted, tight enough that a dozen rows fit on one screen. */
  const cls =
    "flex min-h-[52px] w-full items-center gap-3.5 py-2 text-left transition-opacity";

  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
