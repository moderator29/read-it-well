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
 * WHO JOINED WITH YOUR CODE: a declared route that draws the honest state.
 *
 * Vallo records a sign-up that comes from a code, but no function lets a member
 * read that list (requests R-W6-1 and R-W6-2 to Session 2), and the founder has
 * not decided on any reward. So the page does not say "no referrals" (Vallo
 * cannot tell the member that), does not name a stage, and does not invent a
 * row. It says the list is not shown here and offers the way back to the code.
 * The hub links here again (7 October 2026: the founder could not find it),
 * and this page is what keeps that link honest: it says the list is not shown
 * rather than drawing one.
 */
export default async function ReferralsPage() {
  const t = getDictionary(await getLocale());
  const copy = t.experienceAccount.invite;

  return (
    <div className="mx-auto max-w-2xl" data-testid="invite-referrals">
      <PageHeader title={copy.referralsTitle} subtitle={copy.referrals.lede} fallback="/settings/invite" />
      <EmptyState
        icon="gift"
        art="envelope"
        title={copy.referrals.emptyTitle}
        body={copy.referrals.emptyBody}
        action={
          <ButtonLink href="/settings/invite" variant="secondary" size="lg">
            {copy.referrals.emptyAction}
          </ButtonLink>
        }
        data-testid="invite-referrals-empty"
      />
    </div>
  );
}
