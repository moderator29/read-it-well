import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { RewardsHistory } from "@/components/app/referral/RewardsHistory";
import { FixtureFrame } from "../FixtureFrame";
import { FIXTURE_SNAPSHOT } from "../fixtures";

/** The rewards history on fixture data: rewards, a bonus, a settled and a processing withdrawal. */
export default async function PreviewRewardsHistory() {
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceRewards.history;
  return (
    <FixtureFrame title={copy.title} subtitle={copy.lede}>
      <RewardsHistory entries={FIXTURE_SNAPSHOT.history} copy={copy} locale={locale} />
    </FixtureFrame>
  );
}
