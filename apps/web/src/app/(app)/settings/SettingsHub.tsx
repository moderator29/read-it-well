"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { plural, type Dictionary, type Locale } from "@vallo/i18n";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import { ICON } from "@/components/app/Screen";
import { RowButton, RowLink, RowSelect, RowSwitch, SettingsGroup } from "@/components/app/account/rows";
import { LanguageRow } from "@/components/app/account/SettingsGroups";
import { useNfSettings } from "@/components/app/account/settings-store";
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
 * THE SIX ROW GLYPHS ARE GLASS OBJECTS, NOT STROKES.
 *
 * `7F96BE6C` draws a blue glass object in every one of these tiles, and the
 * icon law says the render decides the tier: a glass object where the image
 * shows one, the stroked tier only for small controls. All six exist in the
 * pack under the names the render draws, person and bell and shield and
 * palette and globe and headset, so not one of them is an approximation.
 *
 * A rendered object carries its own ground and its own light, so it reads at a
 * size a line drawing would disappear at.
 *
 * AND R1's A13 IS CLOSED HERE, WITH THE PACK OPEN BESIDE THE RENDER.
 *
 * A13 read "settings mixes icon tiers in one column". The premise is wrong in
 * code and it was right about the picture, which is why it kept coming back.
 * All six are `BrandIcon` at one size through one function; no tier is mixed
 * and rule 5 is not broken by anything written here. What differed was the
 * ARTWORK. Four of the six, `person-card`, `palette`, `globe` and `headset`,
 * are a white line drawing inside a quiet rounded-square glass tile, which is
 * exactly what `7F96BE6C` draws in all six of its rows. The other two were
 * `bell-badge` and `shield-lock`, which are solid modelled objects with no
 * tile at all: saturated, hot, and half again as bright as their four
 * neighbours, so the column read as two tiers although it was made of one.
 *
 * The fix needed no new artwork. The pack already holds `bell-tile` and
 * `shield-check-tile`, drawn in the tiled line family the other four belong
 * to and matching the render's bell and its ticked shield one for one. Two
 * names, and the column is one family and the render's family.
 *
 * `bell-badge` ALSO CARRIED A BAKED COUNT. Its artwork has a "3" painted into
 * the badge, and it sat on the notifications row of a shipping settings
 * screen where the real number is whatever the person has. Rule 15 forbids an
 * invented count and the third edition's stop list forbids letting a render's
 * baked detail into the product. `bell-tile` has no number on it. That is a
 * second reason this swap is not a preference.
 *
 * WHAT IS STILL NOT FIXED HERE, unpapered: none of the six has a light twin,
 * so on paper all six take the pack's navy chip and the group becomes six
 * dark squares punched into a white card. That is the icon ground in the
 * lead's layer and is reported, not worked around.
 *
 * THE SIZE IS THE TILE'S SIZE, AND THAT IS WHY IT MOVED FROM 24 TO 38.
 * Every one of these objects draws its own tile, and the row draws a tile
 * too (`.nf-hub .nf-srow__icon`, 38px with the shared lit edge). At 24 inside
 * 38 the two tiles did not coincide, so every row shipped a bright square
 * with a second dimmer square nested inside it, which the render has none of:
 * `7F96BE6C` draws ONE tile about 36px carrying one line glyph about 20px.
 * Drawn at the tile's own size the artwork's ground lands under the row's
 * lit edge and the pair read as the single object the render draws.
 */
const HUB_GLYPH = 38;

function HubGlyph({ name }: { name: BrandIconName }) {
  return <BrandIcon name={name} size={HUB_GLYPH} />;
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
          glyph={<HubGlyph name="person-card" />}
          label={hub.accountInfo}
          sub={hub.accountInfoSub}
          value={person?.verified ? <Checked>{hub.verified}</Checked> : undefined}
          testId="hub-account"
        />
        <RowSwitch
          glyph={<HubGlyph name="bell-tile" />}
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
          glyph={<HubGlyph name="shield-check-tile" />}
          label={hub.privacy}
          sub={hub.privacySub}
          value={
            deviceCount !== null && deviceCount > 0
              ? plural(deviceCount, hub.devices, locale)
              : undefined
          }
          testId="hub-privacy"
        />
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
