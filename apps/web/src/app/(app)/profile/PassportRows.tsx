import type { Dictionary, Locale } from "@vallo/i18n/core";
import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { UiIcon, type UiIconName } from "@/design-system/icons/UiIcon";
import type { MyPassport } from "@/lib/trust/passport-read";
import { factValue, factViews, type FactKey } from "../settings/passport/passport-facts";

const FACT_ICON: Record<FactKey, UiIconName> = {
  identity: "id-card",
  phone: "phone",
  attended: "key",
  tenancies: "house",
  since: "calendar-booking",
};

/**
 * YOUR RENTER PASSPORT ON YOUR OWN PAGE, in the credentials section.
 *
 * One card in the settings rows' own anatomy: the passport and whether it is
 * shown (it is off until the member turns it on, and then shown only in the
 * conversations they choose), each fact Vallo recorded with its date or its
 * count (`factViews`, the passport page's own reading, so the two never
 * disagree), and the month the account was opened. Every row opens the
 * passport's own page for that fact.
 *
 * A passport that did not load is not drawn as an empty one: the first row
 * stays, as the way in, with no state on it and no facts under it. The
 * joining month comes from the account, so it stands either way; the
 * passport's own "On Vallo since" fact is the same date and is not repeated.
 */
export function PassportRows({
  passport,
  copy,
  memberSinceLabel,
  memberSince,
  locale,
}: {
  passport: MyPassport | null;
  copy: Dictionary["experienceAccount"]["passport"];
  memberSinceLabel: string;
  /** "Month Year", already worded, or empty when the date is unreadable. */
  memberSince: string;
  locale: Locale;
}) {
  const facts = passport ? factViews(passport.facts, null).filter((view) => view.key !== "since") : [];
  return (
    <SettingsGroup>
      <RowLink
        href="/settings/passport"
        glyph={<UiIcon name="id-card" size={20} />}
        label={copy.credentialLabel}
        sub={passport ? (passport.enabled ? copy.switchOnSub : copy.switchOffSub) : undefined}
        value={passport ? (passport.enabled ? copy.on : copy.off) : undefined}
        testId="profile-passport"
      />
      {facts.map((view) => (
        <RowLink
          key={view.key}
          href={`/settings/passport/${view.key}`}
          glyph={<UiIcon name={FACT_ICON[view.key]} size={20} />}
          label={copy.facts[view.key].title}
          value={factValue(view, locale) ?? undefined}
          testId={`profile-passport-${view.key}`}
        />
      ))}
      {memberSince ? <RowValue icon="calendar-booking" label={memberSinceLabel} value={memberSince} /> : null}
    </SettingsGroup>
  );
}
