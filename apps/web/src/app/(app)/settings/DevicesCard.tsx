import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import type { Dictionary } from "@vallo/i18n";

/**
 * The row that owns where somebody is signed in.
 *
 * A row rather than the list itself, for the same reason `PlaceCard` and
 * `InterestsCard` are rows: a list of sessions with two destructive buttons on
 * each one is the loudest thing that could possibly be on a settings screen,
 * and it has a screen of its own.
 *
 * The count is on the row deliberately. "Devices and sessions" with a chevron
 * is a label somebody scrolls past; "3 signed in" is a fact that makes a person
 * who owns one phone stop and look. That is the entire job of this row, because
 * the account behind it holds a wallet.
 *
 * `count` is null when the list could not be read, and that draws as a prompt
 * to check rather than as a zero. A settings row that says "0 signed in" to
 * somebody who is reading it while signed in is not a smaller mistake than a
 * wrong number, it is a bigger one.
 */
export function DevicesCard({
  t,
  signedIn,
  count,
}: {
  /* Handed down from the settings page, which resolved the locale. */
  t: Dictionary;
  signedIn: boolean;
  count: number | null;
}) {
  const copy = t.settings.devices;

  const value = !signedIn
    ? t.common.notSet
    : count === null
      ? copy.rowValueUnknown
      : count === 1
        ? copy.rowValueOne
        : copy.rowValueMany.replace("{count}", String(count));

  return (
    <SettingsGroup label={copy.screenTitle} note={signedIn ? copy.rowNote : copy.rowNoteSignedOut}>
      <RowLink
        href={signedIn ? "/settings/devices" : "/sign-in"}
        icon="key"
        label={copy.rowLabel}
        value={value}
        testId="settings-devices-row"
      />
    </SettingsGroup>
  );
}
