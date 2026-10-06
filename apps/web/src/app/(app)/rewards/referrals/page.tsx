import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { ReferralList } from "@/components/app/referral/ReferralList";
import { RewardsState } from "@/components/app/referral/RewardsState";
import { INVITE_HREF, rewardsScreen, signInHref } from "../screen";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceRewards.referrals.title, robots: { index: false, follow: false } };
}

/**
 * /rewards/referrals: the people a member invited and where each stands
 * (joined, pending, under review, qualified). Never a reason for a review and
 * never a second level. Draws the not-live state until R-C3-1 exists.
 */
export default async function RewardsReferralsPage() {
  const locale = await getLocale();
  const copy = getDictionary(locale).experienceRewards;
  const screen = await rewardsScreen();
  const header = <PageHeader title={copy.referrals.title} subtitle={copy.referrals.lede} fallback="/rewards" />;

  if (screen.kind === "state") {
    return (
      <div className="mx-auto max-w-2xl">
        {header}
        <RewardsState read={screen.read} copy={copy.states} signInHref={signInHref("/rewards/referrals")} inviteHref={INVITE_HREF} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {header}
      {screen.snapshot.referrals.length === 0 ? (
        <EmptyState
          icon="gift"
          art="envelope"
          title={copy.referrals.emptyTitle}
          body={copy.referrals.emptyBody}
          action={
            <ButtonLink href="/rewards" variant="secondary" size="lg">
              {copy.referrals.emptyAction}
            </ButtonLink>
          }
          data-testid="rewards-referrals-empty"
        />
      ) : (
        <ReferralList rows={screen.snapshot.referrals} copy={copy.referrals} locale={locale} />
      )}
    </div>
  );
}
