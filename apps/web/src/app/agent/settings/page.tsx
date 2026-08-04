import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { getPayoutAccounts } from "@/lib/agent/payout-queries";
import { loadSettingsState } from "@/lib/profile/queries";
import { groupNuban } from "@/lib/agent/payout-schema";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { UiIcon } from "@/design-system/icons/UiIcon";
import { ListingPitch } from "../list/ListingPitch";
import { AccountNotificationsCard } from "../../(app)/settings/AccountToggles";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.settings, robots: { index: false, follow: false } };
}

/**
 * /agent/settings: what a host controls about their own account.
 *
 * This was an eleven-line coming-soon stub, and the one thing it should have
 * carried was already half built elsewhere: the notification switches on
 * /settings wrote to profiles.settings and nothing read them. Now that
 * private.notify and the email recipient resolver both honour that document,
 * the switches genuinely govern what reaches a host, so they belong where a
 * host works as well as where a guest does. There is one preference document
 * per account; this is a second door to it, not a second copy.
 *
 * The trading identity is deliberately read-only. It is the name RentMe
 * verified, it appears on every listing and every thread, and letting an
 * approved host rewrite it after approval would make the verified badge mean
 * nothing. The page says that plainly and gives the route to change it.
 */
export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/settings" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/settings" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="doc-shield" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agent.nav.settings}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            Your host preferences switch on the moment the platform keys land.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-6">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      </AgentShell>
    );
  }

  const [account, payout] = await Promise.all([loadSettingsState(), getPayoutAccounts()]);
  const agent = context.agent;
  const accounts = payout.state === "ready" ? payout.accounts : [];
  const preferred = accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;

  return (
    <AgentShell t={t} locale={locale} active="/agent/settings" profile={agentProfileFrom(agent)}>
      <div className="mb-6">
        <h1 className="nf-h1">{t.agent.nav.settings}</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">
          What reaches you, where your money lands, and the name guests see.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-4">
        {/* ------------------------------------------------ notifications */}
        {account.state === "signed-in" ? (
          <AccountNotificationsCard initial={account.settings.notifications} variant="host" />
        ) : (
          <div className="nf-card p-5">
            <p className="nf-overline">Notifications</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              We could not read your preferences just now. Nothing has changed, and
              you are still receiving everything you were receiving before.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- payout */}
        <div className="nf-card p-5">
          <p className="nf-overline">Where your earnings go</p>
          {preferred ? (
            <>
              <p className="mt-2.5 flex items-center gap-2 text-[0.9375rem] font-semibold text-[var(--nf-content-primary)]">
                <UiIcon name="verified" size={15} className="shrink-0 text-[var(--nf-state-success)]" />
                {preferred.bankName}
              </p>
              <p className="nf-numeric mt-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
                {groupNuban(preferred.accountNumber)}
              </p>
              <p className="mt-1 text-[0.875rem] text-[var(--nf-content-secondary)]">
                {preferred.accountName}
              </p>
              <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
                {accounts.length === 1
                  ? "This is the account your payouts are sent to."
                  : `Your payouts go here. You have ${accounts.length} accounts on file.`}
              </p>
            </>
          ) : (
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
              You have not told us where to send your earnings yet. Nothing can be
              paid out until you do, and it takes about a minute.
            </p>
          )}
          <Link href="/agent/earnings" className="nf-btn nf-btn--glass nf-btn--sm mt-4">
            {preferred ? "Manage payout accounts" : "Add a payout account"}
          </Link>
        </div>

        {/* ------------------------------------------------------ identity */}
        <div className="nf-card p-5">
          <p className="nf-overline">Your host identity</p>
          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[1.0625rem] font-semibold text-[var(--nf-content-primary)]">
            {agent.displayName}
            {agent.verified && (
              <span className="nf-badge nf-badge--brand">
                <UiIcon name="verified" size={12} />
                Verified
              </span>
            )}
          </p>
          <dl className="mt-3 grid gap-1.5 border-t border-[var(--nf-border-subtle)] pt-3 text-[0.875rem]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--nf-content-muted)]">Account type</dt>
              <dd className="text-[var(--nf-content-secondary)]">
                {agent.type === "business" ? "Business" : "Individual"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--nf-content-muted)]">Status</dt>
              <dd className="text-[var(--nf-content-secondary)]">{agent.status}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[0.8125rem] leading-relaxed text-[var(--nf-content-muted)]">
            This is the name RentMe checked and the name on every one of your
            listings, so it is not something to change on your own. Write to
            support and we will change it with you.
          </p>
          <Link href="/contact" className="nf-btn nf-btn--ghost nf-btn--sm mt-3">
            Ask support to change it
          </Link>
        </div>

        {/* ------------------------------------------------------ the rest */}
        <div className="nf-card p-5">
          <p className="nf-overline">Everything else</p>
          <p className="mt-2.5 text-[0.875rem] leading-relaxed text-[var(--nf-content-secondary)]">
            Theme, language, privacy, security and account deletion are one account
            wide, so they live on your RentMe settings page rather than being kept
            in two places.
          </p>
          <Link href="/settings" className="nf-btn nf-btn--glass nf-btn--sm mt-4">
            Open account settings
          </Link>
        </div>
      </div>
    </AgentShell>
  );
}
