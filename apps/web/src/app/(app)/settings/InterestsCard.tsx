import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import { INTEREST_COPY, type PropertyType } from "@/lib/interests/schema";

/**
 * The row that owns what somebody came here for.
 *
 * A row rather than the cards themselves, for the same reason `PlaceCard` is a
 * row: nine toggles inlined into a settings list would be the loudest thing on
 * the screen, and the answer already has a screen that owns it. The row reads
 * back what is stored, so it is never a label that says nothing - and when the
 * stored answer is empty it says so plainly rather than showing "Not set",
 * because saying nothing in particular is a real answer here and not a gap.
 *
 * `asked` is the difference between the two empty states. Somebody who has
 * never been asked and somebody who deliberately took every card off both have
 * an empty list, and telling them the same thing would be wrong in one
 * direction or the other.
 */
export function InterestsCard({
  signedIn,
  interests,
  asked,
}: {
  signedIn: boolean;
  interests: PropertyType[];
  /** True once the first-run question has been answered or skipped. */
  asked: boolean;
}) {
  const value = signedIn
    ? interests.length > 0
      ? interests.map((type) => INTEREST_COPY[type].label).join(", ")
      : asked
        ? "Nothing in particular"
        : "Not answered yet"
    : "Not set";

  return (
    <SettingsGroup
      label="What you are here for"
      note={
        signedIn
          ? "This only decides what we put in front of you first. Any search or filter you set yourself always wins."
          : "Sign in to keep this with your account, so it follows you to every device."
      }
    >
      <RowLink
        href={signedIn ? "/settings/interests" : "/sign-in"}
        icon="compass"
        label="What you are looking for"
        value={value}
        testId="settings-interests-row"
      />
    </SettingsGroup>
  );
}
