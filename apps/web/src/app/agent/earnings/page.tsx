import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readAgentEarnings, type AgentEarnings } from "@/lib/agent/earnings-queries";
import { getPayoutAccounts } from "@/lib/agent/payout-queries";
import { PayoutAccounts } from "@/components/agent/PayoutAccounts";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ListingPitch } from "../list/ListingPitch";
import { EarningsWorkspace } from "./EarningsWorkspace";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agentEarnings.title, robots: { index: false, follow: false } };
}

const UNREADABLE_EARNINGS: AgentEarnings = {
  months: [],
  totalGrossMinor: 0,
  totalAgentShareMinor: 0,
  totalNetMinor: 0,
  settledStays: 0,
  currentMonth: null,
  readable: false,
};

/**
 * /agent/earnings: what has settled from the host's stays, read straight
 * from the ledger.
 *
 * Shaped like /agent/listings and /agent/bookings: the server page resolves
 * who is asking and reads under their own RLS-bound client, then hands the
 * figures to a plain rendering component. Nothing here mutates, so the
 * workspace stays a server component with no client JavaScript to ship.
 */
export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/earnings" profile={null}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/earnings" profile={null}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="wallet-secure" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agentEarnings.title}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            {t.agentEarnings.unconfigured}
          </p>
          <ButtonLink href="/agent/dashboard" variant="secondary" className="mt-6">
            {t.agent.nav.dashboard}
          </ButtonLink>
        </div>
      </AgentShell>
    );
  }

  const earnings = (await readAgentEarnings(context)) ?? UNREADABLE_EARNINGS;
  const payout = await getPayoutAccounts();

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/earnings"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="mb-6">
        <h1 className="nf-h1">{t.agentEarnings.title}</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">{t.agentEarnings.lede}</p>
      </div>

      <EarningsWorkspace t={t.agentEarnings} earnings={earnings} locale={locale} />

      {/* Seeing what you earned is only half of it. This is where it goes.
          Every state that is not "ready" is handled inside the read, and an
          unreadable one simply renders nothing rather than a broken panel. */}
      {payout.state === "ready" && (
        <PayoutAccounts
          accounts={payout.accounts}
          banks={payout.banks}
          resolveAvailable={payout.resolveAvailable}
        />
      )}
    </AgentShell>
  );
}
