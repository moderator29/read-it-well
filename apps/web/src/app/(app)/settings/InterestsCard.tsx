import { RowLink } from "@/components/app/account/rows";
import { withNext } from "@/lib/auth/next-link";
import type { Dictionary } from "@vallo/i18n/core";
import { type PropertyType } from "@/lib/interests/model";

/**
 * The row that owns what somebody came here for.
 *
 * ---------------------------------------------------------------------------
 * IT IS A ROW NOW, AND IT USED TO BE A CARD HOLDING A ROW.
 *
 * Same fold as `DevicesRow` and for the same reason: its own docstring called
 * it a row and it was wrapped in a `SettingsGroup` with a heading and a note,
 * drawn around one link. It sits inside `PlaceCard`, which is where the page's
 * own comment already put it: "directly under where-you-are, because the two
 * together are the whole of what the platform knows about somebody before they
 * have searched for anything: where they are and what they came for". The
 * group's note becomes the row's `sub`.
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
export function InterestsRow({
  t,
  signedIn,
  interests,
  asked,
}: {
  /* Handed down from the settings page, which resolved the locale. The market
     names come from the dictionary too, so a Hausa reader is not shown an
     English list of what they said they came for. */
  t: Dictionary;
  signedIn: boolean;
  interests: PropertyType[];
  /** True once the first-run question has been answered or skipped. */
  asked: boolean;
}) {
  const value = signedIn
    ? interests.length > 0
      ? interests.map((type) => t.interests.markets[type]).join(", ")
      : asked
        ? t.interests.rowNothing
        : t.interests.rowNotAsked
    : t.common.notSet;

  return (
    <RowLink
      href={signedIn ? "/settings/interests" : withNext("/sign-in", "/settings/interests")}
      icon="compass"
      label={t.interests.rowLabel}
      sub={signedIn ? t.interests.rowNote : t.interests.rowNoteSignedOut}
      value={value}
      testId="settings-interests-row"
    />
  );
}
