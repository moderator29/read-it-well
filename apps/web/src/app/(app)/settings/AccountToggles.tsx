"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { updateSettings } from "@/lib/profile/actions";
import type { Dictionary } from "@naijafinds/i18n";
import type { ResolvedProfileSettings, SettingsPatch } from "@/lib/profile/schema";

/**
 * Account-backed preference groups.
 *
 * These render only for a signed-in person on a configured platform. Each flip
 * is optimistic: the switch moves at once, the patch goes to updateSettings
 * which deep-merges it into profiles.settings under row level security, and a
 * refusal puts the switch back exactly where it was with a line saying what
 * happened. Signed out, the settings page renders the on-device cards instead,
 * unchanged, so nothing about that world moves.
 */

/** Shared save behaviour: optimistic, reverting, with a short saved tick. */
function useSettingsSaver() {
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (savedAt === 0) return;
    const timer = window.setTimeout(() => setSavedAt(0), 2500);
    return () => window.clearTimeout(timer);
  }, [savedAt]);

  const save = useCallback((patch: SettingsPatch, revert: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await updateSettings(patch);
      if (result.ok) {
        setSavedAt(Date.now());
        return;
      }
      revert();
      setSavedAt(0);
      setError(result.error);
    });
  }, []);

  return { save, error, saved: savedAt > 0, pending };
}

/**
 * The line under the group.
 *
 * It sits in the group's own note slot rather than inside the card, so a save
 * confirmation never pushes the switches themselves down the screen while
 * somebody is still flipping them.
 */
function saveNote(t: Dictionary, saved: boolean, error: string | null) {
  if (error) {
    return (
      <span role="alert" className="text-[var(--nf-state-error)]">
        {error}
      </span>
    );
  }
  if (!saved) return undefined;
  return (
    <span
      role="status"
      data-testid="settings-saved"
      className="nf-rise inline-flex items-center gap-1.5 text-[var(--nf-state-success)]"
    >
      <UiIcon name="verified" size={16} className="shrink-0" />
      {t.settings.account.saved}
    </span>
  );
}

/* --------------------------------------------------------- notifications */

type NotifyKey = "bookings" | "messages" | "wallet" | "marketing";

/**
 * The same four switches, described from where you are standing.
 *
 * A host reading "changes to your trips" under Agent Mode would reasonably
 * assume it was about trips they had booked, not about the guests arriving at
 * their property. One preference, two honest descriptions of it, which is why
 * the dictionary carries `notify.guest` and `notify.host` rather than one set
 * of words and a component that tries to bend them.
 */
export function AccountNotificationsCard({
  t,
  initial,
  variant = "guest",
}: {
  /* Handed down from whichever server component resolved the locale: /settings
     for a guest, /agent/settings for a host. */
  t: Dictionary;
  initial: ResolvedProfileSettings["notifications"];
  /** Whose words to use. The preference itself is one account-wide setting. */
  variant?: "guest" | "host";
}) {
  const [value, setValue] = useState(initial);
  const { save, error, saved, pending } = useSettingsSaver();
  const words = t.settings.notify[variant];
  const copy: Record<NotifyKey, [string, string]> = {
    bookings: [words.bookings, words.bookingsSub],
    messages: [words.messages, words.messagesSub],
    wallet: [words.wallet, words.walletSub],
    marketing: [words.marketing, words.marketingSub],
  };

  const flip = (key: NotifyKey, next: boolean) => {
    const previous = value;
    setValue({ ...value, [key]: next });
    save({ notifications: { [key]: next } }, () => setValue(previous));
  };

  const ICON: Record<NotifyKey, "calendar-booking" | "chat-bubble" | "wallet" | "sparkle"> = {
    bookings: "calendar-booking",
    messages: "chat-bubble",
    wallet: "wallet",
    marketing: "sparkle",
  };

  const row = (key: NotifyKey) => {
    const [label, description] = copy[key];
    return (
      <RowSwitch
        icon={ICON[key]}
        label={label}
        sub={description}
        checked={value[key]}
        onChange={(next) => flip(key, next)}
        disabled={pending}
      />
    );
  };

  return (
    <SettingsGroup label={t.settings.notifications.label} note={saveNote(t, saved, error)}>
      {row("bookings")}
      {row("messages")}
      {row("wallet")}
      {row("marketing")}
    </SettingsGroup>
  );
}

/* --------------------------------------------------------------- privacy */

export function AccountPrivacyCard({
  t,
  initialPrivacy,
  initialDataSaver,
}: {
  t: Dictionary;
  initialPrivacy: ResolvedProfileSettings["privacy"];
  initialDataSaver: boolean;
}) {
  const [hideActivity, setHideActivity] = useState(initialPrivacy.hideActivity);
  const [dataSaver, setDataSaver] = useState(initialDataSaver);
  const { save, error, saved, pending } = useSettingsSaver();
  const copy = t.settings.notify;

  return (
    <SettingsGroup label={t.settings.privacy.label} note={saveNote(t, saved, error)}>
      <RowSwitch
        icon="user"
        label={copy.hideActivity}
        sub={copy.hideActivitySub}
        checked={hideActivity}
        onChange={(next) => {
          const previous = hideActivity;
          setHideActivity(next);
          save({ privacy: { hideActivity: next } }, () => setHideActivity(previous));
        }}
        disabled={pending}
      />
      <RowSwitch
        icon="compass"
        label={copy.dataSaver}
        sub={copy.dataSaverSub}
        checked={dataSaver}
        onChange={(next) => {
          const previous = dataSaver;
          setDataSaver(next);
          save({ dataSaver: next }, () => setDataSaver(previous));
        }}
        disabled={pending}
      />
    </SettingsGroup>
  );
}
