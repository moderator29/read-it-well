import type { Metadata } from "next";
import Link from "next/link";
import { countOf, getDictionary, type Dictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import type { AgentProfile } from "@/lib/agent/types";
import { getPayoutAccounts, type PayoutAccount } from "@/lib/agent/payout-queries";
import { loadSettingsState } from "@/lib/profile/queries";
import type { ResolvedProfileSettings } from "@/lib/profile/schema";
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
 * The trading identity is deliberately read-only. It is the name Vallo
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
          <p className="mx-auto mt-sm max-w-[42ch] text-[var(--nf-content-secondary)]">
            We cannot reach your preferences right now.
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-lg">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      </AgentShell>
    );
  }

  const [account, payout] = await Promise.all([loadSettingsState(), getPayoutAccounts()]);
  const agent = context.agent;
  const accounts = payout.state === "ready" ? payout.accounts : [];

  return (
    <AgentShell t={t} locale={locale} active="/agent/settings" profile={agentProfileFrom(agent)}>
      <AgentSettingsBody
        t={t}
        agent={agentProfileFrom(agent)}
        accounts={accounts}
        notifications={account.state === "signed-in" ? account.settings.notifications : null}
      />
    </AgentShell>
  );
}

/**
 * The body of /agent/settings, apart from its reads.
 *
 * Separated so the whole screen can be rendered from fixtures in the preview
 * harness and read against the register at 390 dark. The route passes exactly
 * what it read; nothing here fetches anything.
 */
export function AgentSettingsBody({
  t,
  agent,
  accounts,
  notifications,
}: {
  t: Dictionary;
  agent: AgentProfile;
  accounts: PayoutAccount[];
  /** Null when the preference document could not be read. */
  notifications: ResolvedProfileSettings["notifications"] | null;
}) {
  const preferred = accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;

  return (
    <>
      <div className="mb-lg">
        <h1 className="nf-h1">{t.agent.nav.settings}</h1>
        <p className="mt-2xs text-[var(--nf-content-secondary)]">
          What reaches you, where your money lands, and the name guests see.
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-md">
        {/* ------------------------------------------------ notifications */}
        {notifications ? (
          <AccountNotificationsCard t={t} initial={notifications} variant="host" />
        ) : (
          <div className="nf-panel nf-panel--card block p-panel">
            <p className="nf-overline">Notifications</p>
            <p className="mt-xs text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              We could not read your preferences just now. Nothing has changed, and
              you are still receiving everything you were receiving before.
            </p>
          </div>
        )}

        {/* -------------------------------------------------------- payout */}
        <div className="nf-panel nf-panel--card block p-panel">
          <p className="nf-overline">Where your earnings go</p>
          {preferred ? (
            <>
              <p className="mt-sm flex items-center gap-xs text-[length:var(--nf-text-body-sm)] font-semibold text-[var(--nf-content-primary)]">
                <UiIcon name="verified" size={16} className="shrink-0 text-[var(--nf-state-success)]" />
                {preferred.bankName}
              </p>
              <p className="nf-numeric mt-2xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
                {groupNuban(preferred.accountNumber)}
              </p>
              <p className="mt-2xs text-[length:var(--nf-text-body-sm)] text-[var(--nf-content-secondary)]">
                {preferred.accountName}
              </p>
              <p className="mt-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
                {countOf(accounts.length, "payoutAccounts")}
              </p>
            </>
          ) : (
            <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
              You have not told us where to send your earnings yet. Nothing can be
              paid out until you do, and it takes about a minute.
            </p>
          )}
          <Link href="/agent/earnings" className="nf-btn nf-btn--glass nf-btn--sm mt-md">
            {preferred ? "Manage payout accounts" : "Add a payout account"}
          </Link>
        </div>

        {/* ------------------------------------------------------ identity */}
        <div className="nf-panel nf-panel--card block p-panel">
          <p className="nf-overline">Your host identity</p>
          <p className="mt-sm flex flex-wrap items-center gap-x-xs gap-y-2xs text-[length:var(--nf-text-body-lg)] font-semibold text-[var(--nf-content-primary)]">
            {agent.displayName}
            {agent.verified && (
              <span className="nf-badge nf-badge--brand">
                <UiIcon name="verified" size={12} />
                Verified
              </span>
            )}
          </p>
          <dl className="mt-sm grid gap-xs border-t border-[var(--nf-border-subtle)] pt-sm text-[length:var(--nf-text-body-sm)]">
            <div className="flex items-center justify-between gap-sm">
              <dt className="text-[var(--nf-content-muted)]">Account type</dt>
              <dd className="text-[var(--nf-content-secondary)]">
                {agent.type === "business" ? "Business" : "Individual"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-sm">
              <dt className="text-[var(--nf-content-muted)]">Status</dt>
              {/*
                This printed the raw enum, so an agent read APPROVED in
                shouting capitals about their own account. `columnLabel` is the
                console's three-tier lookup and it is available here: the
                dictionary first, the staged English second, and a humanised
                value last, so this reads a real sentence whichever tier
                answers.
              */}
              <dd className="text-[var(--nf-content-secondary)]">
                {t.agent.standing[agent.status] ?? agent.status}
              </dd>
            </div>
          </dl>
          <p className="mt-sm text-[length:var(--nf-text-caption)] leading-relaxed text-[var(--nf-content-muted)]">
            This is the name Vallo checked and the name on every one of your
            listings, so it is not something to change on your own. Write to
            support and we will change it with you.
          </p>
          <Link href="/contact" className="nf-btn nf-btn--ghost nf-btn--sm mt-sm">
            Ask support to change it
          </Link>
        </div>

        {/* ------------------------------------------------------ the rest */}
        <div className="nf-panel nf-panel--card block p-panel">
          <p className="nf-overline">Everything else</p>
          <p className="mt-sm text-[length:var(--nf-text-body-sm)] leading-relaxed text-[var(--nf-content-secondary)]">
            Theme, language, privacy, security and account deletion are one account
            wide, so they live on your Vallo settings page rather than being kept
            in two places.
          </p>
          <Link href="/settings" className="nf-btn nf-btn--glass nf-btn--sm mt-md">
            Open account settings
          </Link>
        </div>
      </div>
    </>
  );
}
