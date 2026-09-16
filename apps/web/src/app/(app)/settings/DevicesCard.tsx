import { RowLink } from "@/components/app/account/rows";
import type { Dictionary } from "@vallo/i18n";

/**
 * The row that owns where somebody is signed in.
 *
 * ---------------------------------------------------------------------------
 * IT IS A ROW NOW, AND IT USED TO BE A CARD HOLDING A ROW.
 *
 * The docstring below already called it a row, and it was wrapped in its own
 * `SettingsGroup`: a heading, a bordered card and a note, drawn around one
 * link. F2-071 measures that at 118px and names it as the clearest instance of
 * why settings is four thousand pixels tall. A labelled surface wrapped around
 * one control is a container that has not earned its border, which is the same
 * argument that folded Language into Appearance.
 *
 * It sits inside `SecurityCard` instead, which is where the page's own comment
 * already said it belonged: "directly under Security, because it is the half of
 * security this screen did not have". The group's note becomes the row's `sub`,
 * so the sentence that explains it survives the card that used to carry it.
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
export function DevicesRow({
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
    <RowLink
      href={signedIn ? "/settings/devices" : "/sign-in"}
      icon="key"
      label={copy.rowLabel}
      sub={signedIn ? copy.rowNote : copy.rowNoteSignedOut}
      value={value}
      testId="settings-devices-row"
    />
  );
}
