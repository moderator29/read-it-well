"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { GroupCard } from "@/components/app/account/SettingsGroups";
import { Toggle } from "@/components/app/account/Toggle";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { updateSettings } from "@/lib/profile/actions";
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

function SaveState({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) {
    return (
      <p role="alert" className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-state-error)]">
        {error}
      </p>
    );
  }
  if (!saved) return null;
  return (
    <p
      role="status"
      data-testid="settings-saved"
      className="nf-rise mt-3 flex items-center gap-1.5 text-[0.8125rem] text-[var(--nf-state-success)]"
    >
      <UiIcon name="verified" size={14} className="shrink-0" />
      Saved to your account
    </p>
  );
}

/* --------------------------------------------------------- notifications */

type NotifyKey = "bookings" | "messages" | "wallet" | "marketing";

export function AccountNotificationsCard({
  initial,
}: {
  initial: ResolvedProfileSettings["notifications"];
}) {
  const [value, setValue] = useState(initial);
  const { save, error, saved, pending } = useSettingsSaver();

  const flip = (key: NotifyKey, next: boolean) => {
    const previous = value;
    setValue({ ...value, [key]: next });
    save({ notifications: { [key]: next } }, () => setValue(previous));
  };

  const row = (key: NotifyKey, label: string, description: string) => (
    <Toggle
      checked={value[key]}
      onChange={(next) => flip(key, next)}
      label={label}
      description={description}
      disabled={pending}
    />
  );

  return (
    <GroupCard overline="Notifications" icon="notification">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        {row("bookings", "Bookings", "Requests, confirmations and changes to your trips.")}
        {row("messages", "Messages", "New replies from hosts and agents you are talking to.")}
        {row("wallet", "Wallet", "Money in, money out, and anything that needs your attention.")}
        {row("marketing", "Ideas and offers", "Occasional highlights from around Nigeria. Off by default.")}
      </div>
      <SaveState saved={saved} error={error} />
    </GroupCard>
  );
}

/* --------------------------------------------------------------- privacy */

export function AccountPrivacyCard({
  initialPrivacy,
  initialDataSaver,
}: {
  initialPrivacy: ResolvedProfileSettings["privacy"];
  initialDataSaver: boolean;
}) {
  const [hideActivity, setHideActivity] = useState(initialPrivacy.hideActivity);
  const [dataSaver, setDataSaver] = useState(initialDataSaver);
  const { save, error, saved, pending } = useSettingsSaver();

  return (
    <GroupCard overline="Privacy" icon="secure">
      <div className="divide-y divide-[var(--nf-border-subtle)]">
        <Toggle
          checked={hideActivity}
          onChange={(next) => {
            const previous = hideActivity;
            setHideActivity(next);
            save({ privacy: { hideActivity: next } }, () => setHideActivity(previous));
          }}
          label="Hide my activity"
          description="Keep your reviews and recent stays off your public profile."
          disabled={pending}
        />
        <Toggle
          checked={dataSaver}
          onChange={(next) => {
            const previous = dataSaver;
            setDataSaver(next);
            save({ dataSaver: next }, () => setDataSaver(previous));
          }}
          label="Data saver"
          description="Load lighter photos on mobile data. Kinder to a small bundle."
          disabled={pending}
        />
      </div>
      <SaveState saved={saved} error={error} />
    </GroupCard>
  );
}
