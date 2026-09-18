"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { plural, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ICON } from "@/components/app/Screen";
import { RowButton, RowLink, RowSelect, RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { LanguageRow } from "@/components/app/account/SettingsGroups";
import { useNfSettings, useThemeChoice, type ThemeChoice } from "@/components/app/account/settings-store";
import { signOut, updateSettings } from "@/lib/profile/actions";
import type { ResolvedProfileSettings } from "@/lib/profile/schema";

/**
 * THE SETTINGS HOME, per `7F96BE6C`.
 *
 * The profile row, then one card of six rows, each with its glyph tile and
 * the fact it answers before it is opened: Account Information (Verified when
 * a human checked this account), Notifications (a real switch), Privacy &
 * Security (how many devices are signed in), Appearance (the theme, changed
 * in place), Language (changed in place), Help & Support. Under that the
 * payment methods block, then Log Out.
 *
 * EVERY CONTROL WRITES THROUGH THE EXISTING STORE OR ACTION. The theme goes
 * through `useThemeChoice`, which is the same mechanism the root layout reads;
 * the language sets the locale cookie through `LanguageRow`; notifications
 * write `profiles.settings` under RLS for a signed-in person and the device
 * document for anybody else; Log Out is the real `signOut` action.
 *
 * The values on the right are FACTS, never decoration. "Verified" appears only
 * when the agent record says a human was checked. The device count is the
 * real count of sessions, or nothing when the list could not be read; it is
 * never a reassuring word nobody checked.
 */

export type SettingsHubProps = {
  t: Dictionary;
  locale: Locale;
  signedIn: boolean;
  person: { name: string; email: string; avatarUrl: string; verified: boolean } | null;
  /** The account's notification channels, for a signed-in person. */
  notifications: ResolvedProfileSettings["notifications"] | null;
  /** Real count of signed-in devices, or null when it could not be read. */
  deviceCount: number | null;
};

const ALL_ON: ResolvedProfileSettings["notifications"] = {
  bookings: true,
  messages: true,
  wallet: true,
  marketing: false,
};
const ALL_OFF: ResolvedProfileSettings["notifications"] = {
  bookings: false,
  messages: false,
  wallet: false,
  marketing: false,
};

function ProfileRow({
  t,
  person,
}: {
  t: Dictionary;
  person: SettingsHubProps["person"];
}) {
  const hub = t.settings.hub;
  if (!person) {
    return (
      <Link href="/sign-in" className="nf-card nf-hub-profile" data-testid="settings-profile-row">
        <span className="nf-hub-profile__avatar" aria-hidden="true">
          <UiIcon name="user" size={24} />
        </span>
        <span className="nf-hub-profile__text">
          <span className="nf-hub-profile__name">{hub.signInRow}</span>
          <span className="nf-hub-profile__email">{hub.signInRowSub}</span>
        </span>
        <UiIcon name="chevron-right" size={ICON.inline} className="nf-hub-profile__chev" />
      </Link>
    );
  }
  const monogram = (person.name || person.email || "?").charAt(0).toUpperCase();
  return (
    <Link href="/profile" className="nf-card nf-hub-profile" data-testid="settings-profile-row">
      <span className="nf-hub-profile__avatar" aria-hidden="true">
        {person.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatarUrl} alt="" width={64} height={64} />
        ) : (
          <span>{monogram}</span>
        )}
      </span>
      <span className="nf-hub-profile__text">
        <span className="nf-hub-profile__name">
          {person.name || person.email}
          {person.verified ? (
            <span className="nf-hub-tick" title={t.socialProfile.verifiedTitle} role="img" aria-label={t.socialProfile.verified}>
              <UiIcon name="verified" size={16} filled />
            </span>
          ) : null}
        </span>
        <span className="nf-hub-profile__email">{person.email}</span>
      </span>
      <UiIcon name="chevron-right" size={ICON.inline} className="nf-hub-profile__chev" />
    </Link>
  );
}

/** An emerald tick beside a word: a state the platform actually checked. */
function Checked({ children }: { children: string }) {
  return (
    <span className="nf-hub-value nf-hub-value--ok">
      {children}
      <UiIcon name="verified" size={16} filled />
    </span>
  );
}

export function SettingsHub({ t, locale, signedIn, person, notifications, deviceCount }: SettingsHubProps) {
  const hub = t.settings.hub;
  const copy = t.settings.appearance;

  /* ------------------------------------------------------- notifications */
  const { settings, set } = useNfSettings();
  const [account, setAccount] = useState(notifications ?? ALL_ON);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const notifyOn = signedIn
    ? account.bookings || account.messages || account.wallet || account.marketing
    : settings.notifyPush || settings.notifyEmail || settings.notifySms || settings.notifyWhatsapp;

  const flipNotifications = useCallback(
    (next: boolean) => {
      setSaveError(null);
      if (!signedIn) {
        set("notifyPush", next);
        set("notifyEmail", next);
        set("notifyWhatsapp", next);
        if (!next) set("notifySms", false);
        return;
      }
      const previous = account;
      const patch = next ? ALL_ON : ALL_OFF;
      setAccount(patch);
      startTransition(async () => {
        const result = await updateSettings({ notifications: patch });
        if (!result.ok) {
          setAccount(previous);
          setSaveError(result.error);
        }
      });
    },
    [signedIn, set, account],
  );

  /* ---------------------------------------------------------- appearance */
  const { theme, chooseTheme } = useThemeChoice();
  const themeOptions: { value: ThemeChoice; label: string }[] = [
    { value: "dark", label: copy.themeDark },
    { value: "light", label: copy.themeLight },
    { value: "system", label: copy.themeSystem },
  ];

  useEffect(() => {
    if (!saveError) return;
    const timer = window.setTimeout(() => setSaveError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [saveError]);

  return (
    <div className="nf-hub space-y-block" data-testid="settings-hub">
      <ProfileRow t={t} person={person} />

      <SettingsGroup
        note={
          saveError ? (
            <span role="alert" className="text-[var(--nf-state-error)]">
              {saveError}
            </span>
          ) : undefined
        }
      >
        <RowLink
          href="/settings/account"
          icon="user"
          label={hub.accountInfo}
          sub={hub.accountInfoSub}
          value={person?.verified ? <Checked>{hub.verified}</Checked> : undefined}
          testId="hub-account"
        />
        <RowSwitch
          icon="bell"
          label={t.settings.notifications.label}
          sub={hub.notificationsSub}
          checked={notifyOn}
          onChange={flipNotifications}
          disabled={pending}
          testId="hub-notifications"
        />
        <RowLink
          href="/settings/privacy"
          icon="shield-stop"
          label={hub.privacy}
          sub={hub.privacySub}
          value={
            deviceCount !== null && deviceCount > 0
              ? plural(deviceCount, hub.devices, locale)
              : undefined
          }
          testId="hub-privacy"
        />
        <RowSelect
          icon="sparkle"
          label={copy.label}
          sub={hub.appearanceSub}
          value={theme}
          options={themeOptions}
          onChange={chooseTheme}
          testId="hub-theme"
        />
        <LanguageRow t={t} current={locale} />
        <RowLink
          href="/settings/help"
          icon="chat-bubble"
          label={hub.help}
          sub={hub.helpSub}
          testId="hub-help"
        />
      </SettingsGroup>

      {/* The Payment Methods block sits here in the render, between the hub
          rows and Log Out. The page renders it (a server component) between
          this component's two halves; see `page.tsx`. */}
    </div>
  );
}

/** Log Out, the last row on the screen. Real `signOut`, with its own error line. */
export function LogOutRow({ t, signedIn }: { t: Dictionary; signedIn: boolean }) {
  const router = useRouter();
  const hub = t.settings.hub;
  const [signingOut, startSignOut] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!signedIn) return null;
  return (
    <div className="nf-hub">
      <SettingsGroup
        note={
          error ? (
            <span role="alert" className="text-[var(--nf-state-error)]">
              {error}
            </span>
          ) : undefined
        }
      >
        <RowButton
          icon="arrow-right"
          label={signingOut ? hub.loggingOut : hub.logOut}
          disabled={signingOut}
          onClick={() => {
            setError(null);
            startSignOut(async () => {
              const result = await signOut();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.replace("/");
              router.refresh();
            });
          }}
          testId="hub-logout"
        />
      </SettingsGroup>
    </div>
  );
}
