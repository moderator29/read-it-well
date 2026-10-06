import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { FixtureFrame } from "../FixtureFrame";
import { FIXTURE_DESTINATION, FIXTURE_MONEY_WORDS, FIXTURE_SNAPSHOT } from "../fixtures";
import { WithdrawFixture } from "./WithdrawFixture";

/** The withdraw flow on fixture data, with fixture actions standing in for the payout provider. */
export default async function PreviewRewardsWithdraw() {
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceRewards.withdraw;
  const s = FIXTURE_SNAPSHOT;
  return (
    <FixtureFrame title={copy.title} subtitle={copy.lede}>
      <WithdrawFixture
        availableMinor={s.balance.availableMinor}
        minimumMinor={s.policy.withdrawMinimumMinor}
        destination={FIXTURE_DESTINATION}
        copy={copy}
        money={FIXTURE_MONEY_WORDS}
        locale={locale}
        historyHref="/preview/rewards/history"
        backHref="/preview/rewards"
      />
    </FixtureFrame>
  );
}
