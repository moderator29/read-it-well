import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readHostBookings, type HostBookingBoard } from "@/lib/agent/bookings-queries";
import { BrandIcon } from "@/design-system/icons/BrandIcon";
import { ListingPitch } from "../list/ListingPitch";
import { BookingsWorkspace } from "./BookingsWorkspace";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agentBookings.title, robots: { index: false, follow: false } };
}

const EMPTY_BOARD: HostBookingBoard = {
  requests: [],
  upcoming: [],
  completed: [],
  cancelled: [],
  total: 0,
};

/**
 * /agent/bookings: the host's queue of requests and stays.
 *
 * Shaped the same way /agent/listings is: the server page resolves who is
 * asking and reads under their own RLS-bound client, then hands the board to
 * a client workspace that owns the tabs and the accept/decline sheets. Those
 * actions revalidate this path themselves, and the workspace calls
 * router.refresh() after every decision so the list always re-renders from
 * the database rather than an optimistic guess.
 */
export default async function Page() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/bookings" profile={profile}>
        <ListingPitch copy={t.agentListings.pitch} signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  if (context.state === "unconfigured") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/bookings" profile={profile}>
        <div className="mx-auto max-w-md py-10 text-center">
          <span className="mx-auto block h-20 w-20">
            <BrandIcon name="calendar-check" fill />
          </span>
          <h1 className="nf-h2 mt-5">{t.agentBookings.title}</h1>
          <p className="mx-auto mt-3 max-w-[42ch] text-[var(--nf-content-secondary)]">
            {t.agentBookings.unconfigured}
          </p>
          <Link href="/agent/dashboard" className="nf-btn nf-btn--glass mt-6">
            {t.agent.nav.dashboard}
          </Link>
        </div>
      </AgentShell>
    );
  }

  const board = (await readHostBookings(context)) ?? EMPTY_BOARD;

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/bookings"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="mb-6">
        <h1 className="nf-h1">{t.agentBookings.title}</h1>
        <p className="mt-1 text-[var(--nf-content-secondary)]">{t.agentBookings.lede}</p>
      </div>

      <BookingsWorkspace t={t.agentBookings} board={board} locale={locale} />
    </AgentShell>
  );
}
