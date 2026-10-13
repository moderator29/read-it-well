import type { Dictionary, Locale } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import { factsFrom } from "@/lib/passport/model";
import { buildPassportView } from "@/lib/passport/view";

/**
 * THE LANDING'S EXAMPLE VALLO PASSPORT, AS LINES.
 *
 * The landing used to draw the old renter passport (a confirmed phone, an
 * identity match, inspections attended). The Vallo passport has none of those:
 * it holds the role, the day the member joined, a verification level and the
 * counts Vallo recorded, and never a phone, email, ID, date of birth or
 * address. So the example is made the way the real one is, from example facts
 * through `buildPassportView`, the function the document, the chat card and
 * the owner's preview are worded with.
 *
 * It is an invented person and says Example where it is drawn, so no trust
 * signal is drawn: the level is Member (nothing checked by a person), never
 * Verified.
 */

const EXAMPLE_ID = "00000000-0000-4000-8000-0000000000e1";

export type ExamplePassportLine = {
  key: "role" | "joined" | "verification" | "rentals";
  icon: UiIconName;
  label: string;
  value: string;
};

export function examplePassportLines(t: Dictionary, locale: Locale): ExamplePassportLine[] {
  const copy = t.passportV2;
  const facts = factsFrom({
    subject_id: EXAMPLE_ID,
    handle: null,
    display_name: null,
    photo: null,
    roles: ["renter"],
    joined_at: "2026-03-02T09:00:00Z",
    verification: "none",
    rentals: 1,
    stays: null,
    review_count: null,
    review_average: null,
    reply_band: null,
    pidgin_ok: null,
  });
  if (!facts) return [];
  const view = buildPassportView(facts, copy, t.socialProfile.roleLine, locale);
  const lines: ExamplePassportLine[] = [];
  if (view.role) lines.push({ key: "role", icon: "user", label: copy.roleLabel, value: view.role });
  if (view.joined) lines.push({ key: "joined", icon: "clock", label: copy.joinedLabel, value: view.joined });
  if (view.level) lines.push({ key: "verification", icon: "id-card", label: copy.levelLabel, value: view.level.label });
  const rentals = view.stats.find((stat) => stat.key === "rentals");
  if (rentals) lines.push({ key: "rentals", icon: "house", label: rentals.label, value: rentals.value });
  return lines;
}
