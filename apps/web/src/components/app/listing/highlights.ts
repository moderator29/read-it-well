import { countOf, formatMoneyGlance, type Dictionary, type Locale } from "@vallo/i18n/core";
import type { UiIconName } from "@/design-system/icons/UiIcon";
import type { Listing } from "@/lib/listings/types";

/**
 * THE HIGHLIGHTS STRIP (founder's reference, 13 October 2026, "Property
 * Detail"): three short facts in one brand-blue card under the lead.
 *
 * The reference fills its card with guesses ("Estimated utility cost",
 * "Nearby daily essentials"). This one is built ONLY from columns the lister
 * answered and that the page already prints in full further down: the grid
 * supply, the backup and its hours, the water, and on a tenancy the move-in
 * total as the lister stated it. Nothing is estimated, scored or inferred, and
 * a fact nobody answered is not drawn (an unanswered light question is not
 * good news, so it is never a tile).
 *
 * At most three, in that order, the move-in total only when fewer than three
 * utility facts were answered (it has its own block right under the strip).
 * Fewer than two facts and there is no strip at all: one fact is not a
 * highlight reel.
 *
 * Pure, so it is proved under the unit config.
 */
export type Highlight = { key: string; icon: UiIconName; label: string; value: string };

export const HIGHLIGHTS_MAX = 3;

export function listingHighlights(listing: Listing, t: Dictionary, locale: Locale, isRental: boolean): Highlight[] {
  const words = t.experienceDetail.utilities;
  const detail = t.catalogue.detail;
  const u = listing.utilities;
  const out: Highlight[] = [];
  if (u?.powerGrid) {
    out.push({ key: "light", icon: "bolt", label: words.light, value: words.grid[u.powerGrid].label });
  }
  if (u?.powerBackup && u.powerBackup !== "NONE" && u.powerBackupHours !== undefined && u.powerBackupHours > 0) {
    out.push({
      key: "backup",
      icon: "clock",
      label: detail.generator,
      value: detail.hoursADay.replace("{hours}", countOf(u.powerBackupHours, "hours", locale)),
    });
  }
  if (u?.waterSupply) {
    out.push({ key: "water", icon: "droplet", label: words.water, value: words.supply[u.waterSupply].label });
  }
  const moveIn = listing.moveInCostMinor ?? 0;
  if (isRental && moveIn > 0 && out.length < HIGHLIGHTS_MAX) {
    out.push({
      key: "move-in",
      icon: "receipt",
      label: listing.moveInCostStated === true ? detail.moveInTotal : detail.moveInFrom,
      value: formatMoneyGlance(moveIn, locale, listing.currency),
    });
  }
  const shown = out.slice(0, HIGHLIGHTS_MAX);
  return shown.length >= 2 ? shown : [];
}
