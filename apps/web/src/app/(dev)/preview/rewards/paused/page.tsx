import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RewardsDashboard } from "@/components/app/referral/RewardsDashboard";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import { FixtureFrame } from "../FixtureFrame";
import { FIXTURE_INVITE, FIXTURE_MONEY_WORDS, FIXTURE_PAUSED_SNAPSHOT } from "../fixtures";

/**
 * The dashboard in a paused month (D64), on fixture data. The invite is handed
 * in exactly as on the running dashboard, so this screen shows that the
 * dashboard itself withholds it: no copy, share sheet or QR, no campaign bonus
 * and no per-referral reward, while every earned figure stays.
 */
export default async function PreviewRewardsPaused() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.experienceRewards;
  if (!FIXTURE_MONEY_WORDS) {
    return (
      <FixtureFrame title={copy.title} subtitle={copy.lede}>
        <RewardsState read={{ state: "not-live" }} copy={copy.states} signInHref="/sign-in" inviteHref="/settings/invite" />
      </FixtureFrame>
    );
  }
  return (
    <FixtureFrame title={copy.title} subtitle={copy.lede}>
      <RewardsDashboard
        snapshot={FIXTURE_PAUSED_SNAPSHOT}
        invite={FIXTURE_INVITE}
        copy={copy}
        money={FIXTURE_MONEY_WORDS}
        pausedEarned={REWARDS_PAUSED_EARNED_LINE}
        locale={locale}
        hrefs={{ referrals: "/preview/rewards/referrals", history: "/preview/rewards/history", withdraw: "/preview/rewards/withdraw" }}
        dismissLabel={t.experienceUi.notNow}
      />
    </FixtureFrame>
  );
}
