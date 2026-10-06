import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceAccount.invite.referralsTitle };
}

export const dynamic = "force-dynamic";

/**
 * ONE REFERRAL: a declared route that draws the honest unavailable state.
 *
 * A member cannot read their referrals yet (R-W6-2), and no reward or stage
 * exists to show, so there is nothing true to draw for any id. The page says
 * so and offers the way back, rather than a status track of steps Vallo does
 * not record.
 */
export default async function ReferralPage() {
  const copy = getDictionary(await getLocale()).experienceAccount.invite.referrals;

  return (
    <div className="mx-auto max-w-2xl" data-testid="invite-referral">
      <PageHeader title={copy.emptyTitle} fallback="/settings/invite" />
      <EmptyState
        icon="gift"
        art="envelope"
        title={copy.emptyTitle}
        body={copy.emptyBody}
        action={
          <ButtonLink href="/settings/invite" variant="secondary" size="lg">
            {copy.emptyAction}
          </ButtonLink>
        }
        data-testid="invite-referral-missing"
      />
    </div>
  );
}
