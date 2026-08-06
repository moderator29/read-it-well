import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import type { Dictionary } from "@naijafinds/i18n";

/**
 * The settings rows that own where somebody is and what they do.
 *
 * Rows, not a form. The three fields need a searchable picker each and their
 * own screen to breathe in, and repeating them here would give the platform two
 * places to change one answer. Each row reads back what is stored on the right,
 * so neither is ever a label that says nothing.
 */
export function PlaceCard({
  t,
  signedIn,
  stateName,
  lgaName,
  occupationName,
}: {
  /* Handed down from the settings page, which resolved the locale. The state
     and local government NAMES come from the database and are English there;
     translating those is a data question, not a dictionary one. */
  t: Dictionary;
  signedIn: boolean;
  stateName: string;
  lgaName: string;
  occupationName: string;
}) {
  const place = [lgaName, stateName].filter(Boolean).join(", ");
  const href = signedIn ? "/settings/place" : "/sign-in";
  const copy = t.settings.place;

  return (
    <SettingsGroup
      label={copy.label}
      note={
        signedIn ? (place ? copy.noteSet : copy.noteUnset) : copy.noteSignedOut
      }
    >
      <RowLink
        href={href}
        icon="location"
        label={copy.lga}
        value={lgaName || t.common.notSet}
        testId="settings-place-row"
      />
      <RowLink href={href} icon="map" label={copy.state} value={stateName || t.common.notSet} />
      <RowLink
        href={href}
        icon="key"
        label={copy.occupation}
        value={occupationName || t.common.notSet}
        testId="settings-occupation-row"
      />
    </SettingsGroup>
  );
}
