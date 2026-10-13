import type { Dictionary } from "@vallo/i18n/core";
import type { InviteRewards } from "@/lib/referral/rewards";

/**
 * THE LINE UNDER A ROW THAT OPENS `/rewards`, read from the rewards read.
 *
 * The Rewards page is linked from the settings hub and the invite hub (and
 * from the member navigation, which carries the title alone). The row's line
 * says what the page will say, so a door never promises a room that is not
 * there:
 *
 *   not-live  "Rewards are not running yet", the page's own not-live title
 *   paused    "Rewards are paused this month", the pause notice's title
 *   running   what the dashboard holds (Pending, Available, who joined)
 *   unknown   nothing: signed out or a failed read says nothing either way
 *
 * Frame words only; no money sentence and no figure. Client safe and pure.
 */
export function rewardsDoorSub(
  rewards: InviteRewards,
  copy: Pick<Dictionary["experienceRewards"], "states" | "pause" | "inviteHub">,
): string | undefined {
  switch (rewards.state) {
    case "not-live":
      return copy.states.notLiveTitle;
    case "paused":
      return copy.pause.title;
    case "running":
      return copy.inviteHub.balanceRowSub;
    default:
      return undefined;
  }
}
