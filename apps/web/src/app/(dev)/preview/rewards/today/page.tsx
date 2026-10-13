import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { FixtureFrame } from "../FixtureFrame";

/** What /rewards draws today, while the rewards read does not exist (R-C3-1). */
export default async function PreviewRewardsNotLive() {
  const copy = getDictionary(await getLocale()).experienceRewards;
  return (
    <FixtureFrame title={copy.title} subtitle={copy.lede}>
      <RewardsState read={{ state: "not-live" }} copy={copy.states} signInHref="/sign-in" inviteHref="/settings/invite" />
    </FixtureFrame>
  );
}
