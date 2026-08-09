import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { BrandIcon, type BrandIconName } from "@/design-system/icons/BrandIcon";
import {
  agentProfileFrom,
  getAgentContext,
  readAgentNumbers,
} from "@/lib/agent/listings-queries";
import { RealDashboard } from "./RealDashboard";
import { readInspectionsForLister } from "@/lib/inspections/queries";
import { ButtonLink } from "@/components/ui/Button";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.dashboard.title, robots: { index: false, follow: false } };
}

/**
 * The agent workspace.
 *
 * A signed-in approved agent sees their own numbers, read live under RLS.
 *
 * NOBODY ELSE SEES NUMBERS AT ALL, and that is the whole of this change. This
 * screen used to fall back to a deck of invented figures for every other
 * caller: 845,060,000 kobo of earnings, 248 bookings, a 98% response rate, an
 * eighteen point sparkline, four listings called Oceanview 3BR Apartment and
 * Victoria Island Luxury Stay, and three guest messages from John D., Maryam
 * S. and Tunde A. A badge above it read "Designed figures", and the file that
 * held them had already worked out why that is not enough: it says, about the
 * agent's own name, that identity is the one thing a label cannot rescue. It
 * was right, and it applied the reasoning to the agent while leaving three
 * invented guests and their messages on the same screen.
 *
 * The catalogue of twenty-three invented listings was deleted for the same
 * reason. This was the same thing in the workspace nobody had opened yet.
 *
 * So there are three honest answers and no fourth. Signed out: this is what
 * the workspace is, here is the way in. Signed in without an agent row: you
 * have no listings yet, here is how to start. Unconfigured: say so plainly.
 */
export default async function AgentDashboardPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const a = t.agent.dashboard;

  const context = await getAgentContext();
  if (context.state === "agent") {
    /* Two independent reads, so they cost one round trip rather than two.
       On the connections this product is built for that is the difference
       between a dashboard and a wait. */
    const [numbers, inspections] = await Promise.all([
      readAgentNumbers(context.supabase, context.agent.id, context.user.id),
      readInspectionsForLister(),
    ]);
    return (
      <AgentShell
        t={t}
        locale={locale}
        active="/agent/dashboard"
        profile={agentProfileFrom(context.agent)}
      >
        <RealDashboard
          t={t}
          locale={locale}
          displayName={context.agent.displayName}
          numbers={numbers}
          inspections={inspections}
        />
      </AgentShell>
    );
  }

  /*
   * What each caller is actually told. One sentence about where they stand and
   * one thing to do about it, which is the same standard every other empty
   * state on this platform is held to.
   */
  const state =
    context.state === "unconfigured"
      ? {
          title: a.unconfiguredTitle,
          body: a.unconfiguredBody,
          href: "/",
          cta: t.common.back,
        }
      : context.state === "signed-out"
        ? { title: a.signedOutTitle, body: a.signedOutBody, href: "/sign-in", cta: t.common.signIn }
        : {
            title: a.notAgentTitle,
            body: a.notAgentBody,
            /* Setting up the Seller profile, which is where the agent
               application went when "Become an agent" stopped being a
               destination. See next.config.ts and roles.ts. */
            href: "/profile/setup/owner",
            cta: a.applyCta,
          };

  return (
    <AgentShell t={t} locale={locale} active="/agent/dashboard" profile={null}>
      <div className="mx-auto max-w-lg py-12 text-center sm:py-16">
        <div className="relative mx-auto grid h-24 w-24 place-items-center sm:h-28 sm:w-28">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full opacity-60 blur-2xl"
            style={{ background: "var(--nf-gradient-agent)" }}
          />
          <span className="relative block h-20 w-20 sm:h-[72px] sm:w-[72px]">
            <BrandIcon name="wallet-secure" fill />
          </span>
        </div>

        <h1 className="nf-h2 mt-5">{state.title}</h1>
        <p className="mx-auto mt-3 max-w-[44ch] leading-relaxed text-[var(--nf-content-secondary)]">
          {state.body}
        </p>
        <ButtonLink href={state.href} variant="primary" size="lg" className="mt-7">
          {state.cta}
        </ButtonLink>

        {/*
          The four things this workspace does, named rather than mocked up. A
          list of what is here is honest at nought listings and still honest at
          a hundred; a chart of numbers nobody earned is neither.
        */}
        <ul className="mt-10 grid gap-3 text-left sm:grid-cols-2">
          {(
            [
              { icon: "homes-sparkle", label: a.addListing, href: "/agent/list" },
              { icon: "calendar-check", label: a.viewBookings, href: "/agent/bookings" },
              { icon: "shield-check", label: a.manageListings, href: "/agent/listings" },
              { icon: "wallet-secure", label: a.earningsReport, href: "/agent/earnings" },
            ] as { icon: BrandIconName; label: string; href: string }[]
          ).map((quick) => (
            <li key={quick.href}>
              <Link
                href={quick.href}
                className="nf-card nf-card--interactive flex items-center gap-3 p-3.5"
              >
                <span className="nf-icon-tile block h-10 w-10 shrink-0">
                  <BrandIcon name={quick.icon} fill />
                </span>
                <span className="text-[0.875rem] font-semibold">{quick.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AgentShell>
  );
}
