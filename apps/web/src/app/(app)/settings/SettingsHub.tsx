"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { plural, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { SettingsGlyph, type SettingsGlyphName } from "@/components/app/account/SettingsGlyph";
import { ICON } from "@/components/app/Screen";
import { ROW_GLYPH, RowButton, RowLink, RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { LanguageRow } from "@/components/app/account/SettingsGroups";
import { DataSaverRow } from "@/components/app/account/DataSaverRow";
import { useNfSettings } from "@/components/app/account/settings-store";
import { clearPacks } from "@/lib/offline/pack-store";
import { clearShelf } from "@/lib/offline/shelf-store";
import { clearOutbox } from "@/lib/offline/outbox";
import { clearAllInflight } from "@/lib/offline/inflight";
import { signOut, updateSettings } from "@/lib/profile/actions";
import type { ResolvedProfileSettings } from "@/lib/profile/schema";
import { RemoteImage } from "@/components/ui/RemoteImage";

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
  /**
   * V-50: the Phone row, drawn only when the page decided phone confirmation
   * is on for a signed-in person. Absent draws nothing (a row that leads to
   * "nothing is needed" is not drawn).
   */
  phoneRow?: { label: string; sub: string } | null;
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
      <Link href="/sign-in" className="nf-panel nf-panel--card nf-hub-profile" data-testid="settings-profile-row">
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
    <Link href="/profile" className="nf-panel nf-panel--card nf-hub-profile" data-testid="settings-profile-row">
      <span className="nf-hub-profile__avatar" aria-hidden="true">
        {person.avatarUrl ? (
          <RemoteImage src={person.avatarUrl} alt="" width={128} height={128} sizes="64px" />
        ) : (
          <span>{monogram}</span>
        )}
      </span>
      <span className="nf-hub-profile__text">
        <span className="nf-hub-profile__name">
          {person.name || person.email}
          {person.verified ? (
            <span className="nf-hub-tick" title={t.socialProfile.verifiedTitle} role="img" aria-label={t.socialProfile.verified}>
              <UiIcon name="verified-badge" size={16} />
            </span>
          ) : null}
        </span>
        <span className="nf-hub-profile__email">{person.email}</span>
      </span>
      <UiIcon name="chevron-right" size={ICON.inline} className="nf-hub-profile__chev" />
    </Link>
  );
}

/**
 * THE ROW GLYPHS ARE LINE DRAWINGS ON THE SHARED ICON PLATE.
 *
 * `7F96BE6C` draws one lit glass tile per row with a white line glyph inside
 * it: person, bell, ticked shield, globe, headset, and the door on Log Out.
 * Until the platform sweep of 23 September the tile was the artwork itself
 * (pack objects `person-card`, `bell-tile`, `shield-check-tile`, `globe`,
 * `headset`, each carrying its own ground), which is why the row slot had to
 * stay empty to avoid two tiles, and why the column never quite matched the
 * console's plates. The founder made the console's plate the standard, so the
 * tile is now `IconPlate` (drawn by `RowGlyph` in `rows.tsx`) and the glyph is
 * a stroked line: `UiIcon` where it has the drawing, `SettingsGlyph` for the
 * four it does not. One plate, one family, on every settings row.
 */
function HubGlyph({ name }: { name: "user" | "bell" | SettingsGlyphName }) {
  return name === "user" || name === "bell" ? (
    <UiIcon name={name} size={ROW_GLYPH} />
  ) : (
    <SettingsGlyph name={name} size={ROW_GLYPH} />
  );
}

/** An emerald tick beside a word: a state the platform actually checked. */
function Checked({ children }: { children: string }) {
  return (
    <span className="nf-hub-value nf-hub-value--ok">
      {children}
      <UiIcon name="verified-badge" size={16} />
    </span>
  );
}

export function SettingsHub({
  t,
  locale,
  signedIn,
  person,
  notifications,
  deviceCount,
  phoneRow = null,
}: SettingsHubProps) {
  const hub = t.settings.hub;
  /* The appearance group and its theme row went with light mode on 23
     September. `t.settings.appearance` still exists in the dictionary and is
     now unread here; removing the keys is the i18n sweep's job, not this
     component's. */

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

  useEffect(() => {
    if (!saveError) return;
    const timer = window.setTimeout(() => setSaveError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [saveError]);

  return (
    <div className="nf-hub space-y-block" data-testid="settings-hub">
      <ProfileRow t={t} person={person} />

      {/* V-79: the data saver, at the top where people look for it. */}
      <DataSaverRow copy={t.platform.lite} />

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
          glyph={<HubGlyph name="user" />}
          label={hub.accountInfo}
          sub={hub.accountInfoSub}
          value={person?.verified ? <Checked>{hub.verified}</Checked> : undefined}
          testId="hub-account"
        />
        <RowSwitch
          glyph={<HubGlyph name="bell" />}
          label={t.settings.notifications.label}
          sub={hub.notificationsSub}
          value={notifyOn ? hub.on : hub.off}
          checked={notifyOn}
          onChange={flipNotifications}
          disabled={pending}
          testId="hub-notifications"
        />
        <RowLink
          href="/settings/privacy"
          glyph={<HubGlyph name="shield-check" />}
          label={hub.privacy}
          sub={hub.privacySub}
          value={
            deviceCount !== null && deviceCount > 0
              ? plural(deviceCount, hub.devices, locale)
              : undefined
          }
          testId="hub-privacy"
        />
        {phoneRow && (
          <RowLink
            href="/settings/phone"
            glyph={<HubGlyph name="user" />}
            label={phoneRow.label}
            sub={phoneRow.sub}
            testId="hub-phone"
          />
        )}
        {/*
          THE APPEARANCE ROW IS GONE, and it was the theme. The founder removed
          light mode from the platform on 23 September 2026, so this hub has
          nothing to offer here: one palette, no choice, and the row deleted
          rather than left showing "Dark" as the only option somebody can pick.
          Text size and reduced motion still live on the Appearance card inside
          `/settings`, which is where they always were.
        */}
        <LanguageRow
          t={t}
          current={locale}
          label={t.settings.language.label}
          sub={hub.languageSub}
          glyph={<HubGlyph name="globe" />}
        />
        <RowLink
          href="/settings/help"
          glyph={<HubGlyph name="headset" />}
          label={hub.help}
          sub={hub.helpSub}
          testId="hub-help"
        />
      </SettingsGroup>

      {/* The Payment Methods block sits here in the render, between the hub
          rows and Log Out. The page renders worker E's `PaymentMethodsBlock`
          (a server component on the real reads) between this component's two
          halves; see `page.tsx`. */}
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
          glyph={<HubGlyph name="log-out" />}
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
              /* V-35, V-77: a shared phone keeps neither somebody else's gate code
                 nor their shortlist. */
              await clearPacks();
              await clearShelf();
              await clearOutbox();
              clearAllInflight();
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
