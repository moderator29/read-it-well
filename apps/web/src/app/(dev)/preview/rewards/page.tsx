import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RewardsDashboard } from "@/components/app/referral/RewardsDashboard";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { FixtureFrame } from "./FixtureFrame";
import { FIXTURE_INVITE, FIXTURE_MONEY_WORDS, FIXTURE_SNAPSHOT } from "./fixtures";

/** The referral dashboard on fixture data (D51). The product route is /rewards. */
export default async function PreviewRewards() {
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
        snapshot={FIXTURE_SNAPSHOT}
        invite={FIXTURE_INVITE}
        copy={copy}
        money={FIXTURE_MONEY_WORDS}
        locale={locale}
        hrefs={{ referrals: "/preview/rewards/referrals", history: "/preview/rewards/history", withdraw: "/preview/rewards/withdraw" }}
        dismissLabel={t.experienceUi.notNow}
      />
    </FixtureFrame>
  );
}
