import { RowLink, SettingsGroup } from "@/components/app/account/rows";

/**
 * The settings rows that own where somebody is and what they do.
 *
 * Rows, not a form. The three fields need a searchable picker each and their
 * own screen to breathe in, and repeating them here would give the platform two
 * places to change one answer. Each row reads back what is stored on the right,
 * so neither is ever a label that says nothing.
 */
export function PlaceCard({
  signedIn,
  stateName,
  lgaName,
  occupationName,
}: {
  signedIn: boolean;
  stateName: string;
  lgaName: string;
  occupationName: string;
}) {
  const place = [lgaName, stateName].filter(Boolean).join(", ");
  const href = signedIn ? "/settings/place" : "/sign-in";

  return (
    <SettingsGroup
      label="Where you are"
      note={
        signedIn
          ? place
            ? "This is the city home opens on. Your occupation comes from the platform's own list of 749, so it can be searched on."
            : "Set these and home opens where you are."
          : "Sign in to keep your state and local government with your account."
      }
    >
      <RowLink
        href={href}
        icon="location"
        label="Local government"
        value={lgaName || "Not set"}
        testId="settings-place-row"
      />
      <RowLink href={href} icon="map" label="State" value={stateName || "Not set"} />
      <RowLink
        href={href}
        icon="key"
        label="What you do"
        value={occupationName || "Not set"}
        testId="settings-occupation-row"
      />
    </SettingsGroup>
  );
}
