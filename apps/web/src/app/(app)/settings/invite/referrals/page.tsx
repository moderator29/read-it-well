import type { Metadata } from "next";
import { formatDate, getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { StatusChip, type ChipState } from "@/components/ui/StatusChip";
import { RowLink, SettingsGroup } from "@/components/app/account/rows";
import { readReferralSummary, type ReferralStage } from "../referral-reads";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).experienceAccount.invite.referralsTitle };
}

export const dynamic = "force-dynamic";

/** A stage is a state said three ways (word, shape, colour), never colour alone. */
const CHIP: Record<ReferralStage, ChipState> = {
  joined: "neutral",
  confirmed: "pending",
  qualified: "protected",
  rewarded: "success",
  reversed: "failed",
};

/**
 * WHO JOINED WITH YOUR CODE: the inner page for the list (D25). Each row opens
 * that referral's own page. Until the member can read their referrals
 * (`referral-reads.ts`, R-W6-1) this draws the honest state: it does not say
 * "no referrals", because Vallo cannot yet tell the member that, and it does
 * not invent a row. It says the list is not shown here yet and what will
 * appear, and offers the way back to the code.
 */
export default async function ReferralsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = t.experienceAccount.invite;
  const summary = await readReferralSummary();

  return (
    <div className="mx-auto max-w-2xl" data-testid="invite-referrals">
      <PageHeader title={copy.referralsTitle} subtitle={copy.referrals.lede} fallback="/settings/invite" />
      {!summary || summary.referrals.length === 0 ? (
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
      ) : (
        <SettingsGroup>
          {summary.referrals.map((row) => (
            <RowLink
              key={row.id}
              href={`/settings/invite/referrals/${row.id}`}
              icon="user"
              label={row.firstName ?? copy.referrals.someone}
              sub={copy.referrals.joinedOn.replace(
                "{date}",
                formatDate(new Date(row.joinedAt), locale, { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" }),
              )}
              value={<StatusChip state={CHIP[row.stage]}>{copy.referrals.steps[row.stage]}</StatusChip>}
            />
          ))}
        </SettingsGroup>
      )}
    </div>
  );
}
