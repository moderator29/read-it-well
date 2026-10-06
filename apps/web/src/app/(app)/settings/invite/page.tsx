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
import { gateFirstRun } from "@/components/app/feature-onboarding/first-run-store";
import { resolveSession } from "@/lib/actions/session";
import { myInviteCode } from "@/lib/referral/server";
import { invitePath } from "@/lib/referral/code";
import { inviteRewards } from "@/lib/referral/rewards";
import { readMyRewards } from "@/lib/referral/rewards-read";
import { RewardsPauseNotice } from "@/components/app/referral/RewardsPauseNotice";
import { REWARDS_PAUSED_EARNED_LINE } from "@/components/app/referral/money-words";
import { InviteRewardLines } from "@/components/app/referral/InviteRewardLines";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).publicDoors.invite.rowTitle };
}

/**
 * THE REFERRAL HUB (A5, rebuilt by W6). The member's own invite code, made on
 * first visit, revealed as a gift: a sealed gift, then a dashed ticket that
 * unfolds with the code on it (`InviteTicket`).
 *
 * WHAT IS ON IT, AND WHY NOTHING ELSE. The code and the link are real. Vallo
 * records a sign-up that comes from a code, but a member cannot read that list
 * here, so there is no earned figure, no progress and no "who joined" row
 * (auditor A2, 6 October 2026). No investment framing, no downline, no
 * passive-income language: the how-it-works page says what is and is not
 * recorded.
 *
 * WHAT IT SAYS ABOUT A REWARD follows the rewards read, the one gate every
 * rewards surface uses (`inviteRewards`; there is no feature flag for it):
 *
 *   not-live  under the ticket, "There is no reward for inviting", in the
 *             invite door's own words
 *   running   under the ticket, what the invited person gets, what the member
 *             earns and when (Pending, then Available) and the monthly budget,
 *             every money sentence from `lib/money/copy.ts` and the reward
 *             from the read's policy; and a row to the Rewards Balance. The
 *             founder: write it for the live state now, because a screen that
 *             has to be corrected at launch gets forgotten at launch
 *   unknown   (signed out, or the read failed) neither
 *
 * It is a hub with inner pages (D25): `/settings/invite/how-it-works`, and the
 * two declared referral routes, which draw the honest unavailable state until
 * Session 2 lets a member read their own referrals (R-W6-1, R-W6-2).
 *
 * PAUSED (D64). Once the rewards programme is live and the month's platform
 * budget is reached, this hub stops inviting: the ticket (copy, share sheet,
 * WhatsApp) and the link row are not drawn, the invite's first run is not
 * shown, and the pause notice stands in their place. Today the rewards read
 * answers not-live, so nothing here changes until it exists.
 */
export default async function InviteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const door = t.publicDoors.invite;
  const copy = t.experienceAccount.invite;
  const lede = t.experienceAccount.settings.lede;

  /* THE INVITE'S FIRST RUN (north star 14.1, D11): once, for a signed-in
     member, before anything is read. This page has no signed-out screen of its
     own (a signed-out visit falls to the "unavailable" state below), so the
     check is made here, and a visitor who is not signed in is never sent to a
     first run. The gate fails towards drawing the page. */
  const rewards = inviteRewards(await readMyRewards());
  const paused = rewards.state === "paused" ? rewards.programme : null;
  if (!paused && (await resolveSession()).state === "signed-in") {
    await gateFirstRun("invite", "/settings/invite", await searchParams);
  }

  if (paused) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title={door.rowTitle} subtitle={door.rowSub} fallback="/settings" />
        <SettingsLede label={lede.what} what={lede.invite.what} who={lede.invite.who} />
        <div className="space-y-block">
          <RewardsPauseNotice
            programme={paused}
            copy={t.experienceRewards.pause}
            earned={REWARDS_PAUSED_EARNED_LINE}
            locale={locale}
            inviteOff
          />
          <SettingsGroup label={copy.groupLabel}>
            <RowLink
              href="/settings/invite/how-it-works"
              icon="info"
              label={copy.howTitle}
              sub={copy.howSub}
              testId="invite-how-row"
            />
          </SettingsGroup>
        </div>
      </div>
    );
  }

  const code = await myInviteCode();
  const url = code ? `${siteUrl().replace(/\/+$/, "")}${invitePath(code)}` : null;
  const seen = code ? (await cookies()).get(INVITE_SEEN_COOKIE)?.value === code : true;

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
          {rewards.state === "not-live" ? (
            <p className={`${TYPE.caption} text-center`} data-testid="invite-no-reward">
              {door.noReward}
            </p>
          ) : null}
          {rewards.state === "running" ? (
            <InviteRewardLines policy={rewards.policy} t={t} locale={locale} testId="invite-rewards-running" />
          ) : null}

          <SettingsGroup label={copy.groupLabel}>
            <RowValue
              icon="link"
              label={copy.linkLabel}
              value={<span className="nf-numeric break-all">{url.replace(/^https?:\/\//, "")}</span>}
              testId="invite-url"
            />
            <RowLink
              href="/settings/invite/how-it-works"
              icon="info"
              label={copy.howTitle}
              sub={copy.howSub}
              testId="invite-how-row"
            />
            {rewards.state === "running" ? (
              <RowLink
                href="/rewards"
                icon="hand-coins"
                label={t.experienceRewards.inviteHub.balanceRow}
                sub={t.experienceRewards.inviteHub.balanceRowSub}
                testId="invite-rewards-row"
              />
            ) : null}
          </SettingsGroup>
        </div>
      ) : (
        <EmptyState icon="gift" title={door.rowTitle} body={door.unavailable} data-testid="invite-unavailable" />
      )}
    </div>
  );
}
