import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ReferralList } from "@/components/app/referral/ReferralList";
import { FixtureFrame } from "../FixtureFrame";
import { FIXTURE_SNAPSHOT } from "../fixtures";

/** The referral list on fixture data: all four statuses, one person with no first name. */
export default async function PreviewRewardsReferrals() {
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceRewards.referrals;
  return (
    <FixtureFrame title={copy.title} subtitle={copy.lede}>
      <ReferralList rows={FIXTURE_SNAPSHOT.referrals} copy={copy} locale={locale} />
    </FixtureFrame>
  );
}
