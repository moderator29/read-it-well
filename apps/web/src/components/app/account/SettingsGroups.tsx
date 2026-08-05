"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, localeMeta, type Locale } from "@naijafinds/i18n";
import { LOCALE_COOKIE } from "@/lib/locale.constants";
import { NIGERIAN_STATES } from "@/lib/data/nigeria";
import { RowButton, RowSelect, RowSwitch, RowValue, SettingsGroup } from "./rows";
import {
  applyReduceMotion,
  applyTextSize,
  applyTheme,
  readThemeChoice,
  useNfSettings,
  type TextSize,
  type ThemeChoice,
} from "./settings-store";

/**
 * The settings groups, as rows.
 *
 * These were seven cards, each with a 44px illustrated tile, an overline, and
 * its own inner layout: a segmented chip row here, a bare `<select>` there, a
 * full-width button somewhere else. Every group was defensible and the stack
 * had no rhythm at all. On a 390px phone it read as seven separate screens
 * stacked, and finding one preference meant reading all of them.
 *
 * Now every group is the same object: a quiet label outside a card, and inside
 * it rows that all begin at the same vertical. The change that matters most is
 * that **a row states its own value**. "Theme" told you nothing; "Theme   Dark"
 * has answered before you touched it, and most visits to a settings screen are
 * to check something rather than to change it.
 *
 * The single-choice controls became native selects rather than chip rows.
 * Three chips for a theme were fine; three chips for a theme, three for text
 * size, two for units and two for visibility were ten chips competing for the
 * same attention. A select collapses each to its answer and opens the picker
 * the phone already has.
 *
 * Everything on this file is stored on the device and applies to the device.
 * The account-backed groups live in `app/(app)/settings/AccountToggles.tsx` and
 * draw from the same primitives, so the two look identical and only the storage
 * differs.
 */

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

  return (
    <SettingsGroup label="Appearance" note="Kept on this device. Dark is the designed default.">
      <RowSelect
        icon="sparkle"
        label="Theme"
        value={theme}
        options={THEME_OPTIONS}
        onChange={chooseTheme}
        testId="setting-theme"
      />
      <RowSelect
        icon="grid"
        label="Text size"
        value={settings.textSize}
        options={TEXT_SIZES}
        onChange={(next) => set("textSize", next)}
      />
      <RowSwitch
        icon="sliders"
        label="Reduce motion"
        sub="Calms entrance animations and hover movement across the app."
        checked={settings.reduceMotion}
        onChange={(next) => {
          set("reduceMotion", next);
          applyReduceMotion(next);
        }}
      />
      {/*
       * The data-saver switch lives beside the other two device settings
       * because it is one: it is stored on the device, it applies to this
       * device, and nothing about it belongs to an account.
       *
       * The description states what it actually does, not "uses less data".
       * Loading a listing before it is asked for is the single largest
       * speculative spend the app makes, and a person on a metered bundle is
       * entitled to know that is what they are switching off. Android's own
       * Data Saver and a 2g link already turn this on by themselves without
       * anybody touching this row; see `lib/ui/data-saver.ts`.
       */}
      <RowSwitch
        icon="compass"
        label="Use less data"
        sub="Stops the app loading a place before you have opened it, and asks for smaller photographs."
        checked={settings.dataSaver}
        onChange={(next) => set("dataSaver", next)}
      />
    </SettingsGroup>
  );
}

/* --------------------------------------------------------------- language */

/**
 * Language picker.
 *
 * Writes the locale cookie the server reads, then refreshes the server tree so
 * every string re-renders in the chosen language. One select rather than four
 * radio rows: a language is one answer, and the four rows took a third of the
 * screen to say so.
 */
export function LanguageCard({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Locale>(current);

  const choose = (next: Locale) => {
    if (next === selected || pending) return;
    setSelected(next);
    // One year, lax. A language choice holds no personal data.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  };

  return (
    <SettingsGroup label="Language">
      <RowSelect
        icon="chat-bubble"
        label="App language"
        value={selected}
        /* The native name first, because somebody looking for Yoruba is
           looking for "Yorùbá". The English name follows only where the two
           differ, so English itself does not read as "English (English)". */
        options={LOCALES.map((code) => ({
          value: code,
          label:
            localeMeta[code].label === localeMeta[code].native
              ? localeMeta[code].native
              : `${localeMeta[code].native} (${localeMeta[code].label})`,
        }))}
        onChange={choose}
        testId="setting-language"
      />
    </SettingsGroup>
  );
}

/* ---------------------------------------------------------- notifications */

type NotifyKey = "notifyPush" | "notifyEmail" | "notifySms" | "notifyWhatsapp";

export function NotificationsCard() {
  const { settings, set } = useNfSettings();

  const row = (key: NotifyKey, icon: "bell" | "share" | "chat-bubble", label: string, sub: string) => (
    <RowSwitch
      icon={icon}
      label={label}
      sub={sub}
      checked={settings[key]}
      onChange={(next) => set(key, next)}
    />
  );

  return (
    <SettingsGroup
      label="Notifications"
      note="Kept on this device until you sign in, then they follow your account."
    >
      {row("notifyPush", "bell", "Push notifications", "Booking updates and replies, straight to this device.")}
      {row("notifyEmail", "share", "Email", "Receipts, confirmations and occasional highlights.")}
      {row("notifySms", "chat-bubble", "SMS", "Time-critical booking alerts by text message.")}
      {row("notifyWhatsapp", "chat-bubble", "WhatsApp", "Booking confirmations and host replies on WhatsApp.")}
    </SettingsGroup>
  );
}

/* ---------------------------------------------------------------- privacy */

export function PrivacyCard() {
  const { settings, set } = useNfSettings();

  return (
    <SettingsGroup
      label="Privacy"
      note="Who can see me covers your name and reviews on listings."
    >
      <RowSelect
        icon="user"
        label="Who can see me"
        value={settings.profileVisibility}
        options={[
          { value: "everyone", label: "Everyone" },
          { value: "private", label: "Only me" },
        ]}
        onChange={(next) => set("profileVisibility", next)}
      />
      <RowSwitch
        icon="verified"
        label="Read receipts"
        sub="Let hosts see when you have read their messages."
        checked={settings.readReceipts}
        onChange={(next) => set("readReceipts", next)}
      />
      <RowSwitch
        icon="sparkle"
        label="Personalised recommendations"
        sub="Use your searches and saves to rank places you will like."
        checked={settings.personalisedRecs}
        onChange={(next) => set("personalisedRecs", next)}
      />
    </SettingsGroup>
  );
}

/* ----------------------------------------------------------------- search */

export function SearchCard() {
  const { settings, set } = useNfSettings();

  return (
    <SettingsGroup
      label="Search"
      note="Search opens on your default area, and you can always look anywhere. Every price across RentMe is shown in Naira."
    >
      <RowSelect
        icon="search"
        label="Default area"
        value={settings.defaultCity}
        options={[
          { value: "", label: "All of Nigeria" },
          ...NIGERIAN_STATES.map((state) => ({ value: state, label: state })),
        ]}
        onChange={(next) => set("defaultCity", next)}
      />
      <RowValue icon="wallet" label="Currency" value="₦ NGN" />
      <RowSelect
        icon="map"
        label="Map distances"
        value={settings.distanceUnit}
        options={[
          { value: "km", label: "Kilometres" },
          { value: "mi", label: "Miles" },
        ]}
        onChange={(next) => set("distanceUnit", next)}
      />
    </SettingsGroup>
  );
}

/* --------------------------------------------------------------- security */

/**
 * Security: the app lock preference plus a truthful view of sessions. There is
 * exactly one session today, this device, so that is what the row shows, and
 * sign out everywhere says plainly when it will start doing something.
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
    <SettingsGroup
      label="Security"
      note={
        signOutNote
          ? "This is your only session, so there is nothing else to sign out. Once accounts launch, this control ends every session on every device at once."
          : undefined
      }
    >
      <RowSwitch
        icon="key"
        label="Biometric app lock"
        sub="Ask for fingerprint or face unlock when the app opens, on devices that support it."
        checked={settings.appLock}
        onChange={(next) => set("appLock", next)}
      />
      <RowValue icon="verified" label="Signed in on" value={device} />
      <RowButton
        icon="arrow-right"
        label="Sign out everywhere"
        onClick={() => setSignOutNote(true)}
        chevron={false}
      />
    </SettingsGroup>
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
    <SettingsGroup
      label="Your data"
      note={
        exportNote
          ? "Right now everything RentMe knows about you lives in this browser, and nothing has left this device. Full data export ships with the launch release."
          : undefined
      }
    >
      <RowButton
        icon="share"
        label="Download my data"
        sub="A copy of everything RentMe holds about you."
        onClick={() => setExportNote(true)}
      />
      <RowButton
        icon="close"
        label={confirmClear ? "Tap again to confirm" : "Clear local data"}
        sub="Removes your profile name, preferences and saved conversations from this device, then reloads."
        onClick={clearLocalData}
        danger={confirmClear}
        chevron={false}
      />
    </SettingsGroup>
  );
}
