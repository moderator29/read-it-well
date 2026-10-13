import type { Dictionary } from "@vallo/i18n/core";
import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * YOUR VALLO PASSPORT ON YOUR OWN PAGE, in the credentials section.
 *
 * One card in the settings rows' own anatomy: the way into the passport page,
 * with whether it is on (it is on by default, with every line shown), and the
 * month the account was opened. The lines and their switches live on the
 * passport page itself.
 *
 * A passport state that could not be read is not drawn as "off": the row stays
 * as the way in, with no state on it.
 */
export function PassportRows({
  on,
  copy,
  memberSinceLabel,
  memberSince,
}: {
  /** Whether the passport is on, or null when that could not be read. */
  on: boolean | null;
  copy: Dictionary["passportV2"];
  memberSinceLabel: string;
  /** "Month Year", already worded, or empty when the date is unreadable. */
  memberSince: string;
}) {
  return (
    <SettingsGroup>
      <RowLink
        href="/settings/passport"
        glyph={<UiIcon name="id-card" size={20} />}
        label={copy.title}
        sub={on === null ? undefined : on ? copy.wholeOnSub : copy.wholeOffSub}
        value={on === null ? undefined : on ? copy.on : copy.off}
        testId="profile-passport"
      />
      {memberSince ? <RowValue icon="calendar-booking" label={memberSinceLabel} value={memberSince} /> : null}
    </SettingsGroup>
  );
}
