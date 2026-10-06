import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { siteUrl } from "@/lib/site";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState, TYPE } from "@/components/app/Screen";
import { RowLink, RowValue, SettingsGroup } from "@/components/app/account/rows";
import { SettingsLede } from "@/components/app/account/SettingsLede";
import { InviteTicket } from "@/components/app/account/InviteTicket";
import { INVITE_SEEN_COOKIE } from "@/components/app/account/invite-cookie";
import { ReferralFigures } from "@/components/app/account/ReferralFigures";
import { myInviteCode } from "@/lib/referral/server";
import { invitePath } from "@/lib/referral/code";
import { readReferralSummary } from "./referral-reads";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).publicDoors.invite.rowTitle };
}

/**
 * THE REFERRAL HUB (A5, rebuilt by W6). The member's own invite code, made on
 * first visit, revealed as a gift: a sealed gift, then a dashed ticket that
 * unfolds with the code on it (`InviteTicket`).
 *
 * WHAT IS ON IT, AND WHY NOTHING ELSE. The code and the link are real. The
 * earned figure and the progress to a next reward are drawn only from real
 * data (`ReferralFigures`), and today there is none: no reward or ledger exists
 * and members cannot read who joined (`referral-reads.ts`, requests R-W6-1 and
 * R-W6-2). So the hub draws the honest rows instead (who joined, how invites
 * work) and says under the ticket that there is no reward for inviting, in the
 * words the invite door already uses. No investment framing, no downline, no
 * passive-income language: the how-it-works page says what is and is not
 * recorded.
 *
 * It is a hub with two inner pages (D25): `/settings/invite/referrals` (each
 * person, and each referral's state) and `/settings/invite/how-it-works`.
 */
export default async function InviteSettingsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const door = t.publicDoors.invite;
  const copy = t.experienceAccount.invite;
  const lede = t.experienceAccount.settings.lede;

  const code = await myInviteCode();
  const url = code ? `${siteUrl().replace(/\/+$/, "")}${invitePath(code)}` : null;
  const seen = code ? (await cookies()).get(INVITE_SEEN_COOKIE)?.value === code : true;
  const summary = code ? await readReferralSummary() : null;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={door.rowTitle} subtitle={door.rowSub} fallback="/settings" />
      <SettingsLede label={lede.what} what={lede.invite.what} who={lede.invite.who} />

      {code && url ? (
        <div className="space-y-block">
          <InviteTicket
            copy={copy}
            code={code}
            url={url}
            shareText={door.shareText.replace("{url}", url)}
            whatsappLabel={door.whatsapp}
            dismissLabel={t.experienceUi.notNow}
            autoplay={!seen}
          />
          <p className={`${TYPE.caption} text-center`} data-testid="invite-no-reward">
            {door.noReward}
          </p>

          {summary ? (
            <ReferralFigures
              copy={copy}
              locale={locale}
              earnedMinor={summary.earnedMinor}
              progress={summary.progress}
            />
          ) : null}

          <SettingsGroup label={copy.groupLabel}>
            <RowValue
              icon="link"
              label={copy.linkLabel}
              value={<span className="nf-numeric break-all">{url.replace(/^https?:\/\//, "")}</span>}
              testId="invite-url"
            />
            <RowLink
              href="/settings/invite/referrals"
              icon="users"
              label={copy.referralsTitle}
              sub={copy.referralsSub}
              testId="invite-referrals-row"
            />
            <RowLink
              href="/settings/invite/how-it-works"
              icon="info"
              label={copy.howTitle}
              sub={copy.howSub}
              testId="invite-how-row"
            />
          </SettingsGroup>
        </div>
      ) : (
        <EmptyState icon="gift" title={door.rowTitle} body={door.unavailable} data-testid="invite-unavailable" />
      )}
    </div>
  );
}
