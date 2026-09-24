import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readInspectionsForLister } from "@/lib/inspections/queries";
import { InspectionHero, InspectionSheet } from "@/components/app/inspections/InspectionSheet";
import { InspectionsLive } from "@/components/app/inspections/InspectionsLive";
import { EmptyState, Section, Stack, TYPE } from "@/components/app/Screen";
import { resolveSession } from "@/lib/actions/session";
import { readListingFacts } from "@/components/app/plans/inspection-facts";
import { readReportsFor } from "@/lib/inspections/report-queries";
import { reportStorageLive } from "@/lib/inspections/report-flag";
import { ButtonLink } from "@/components/ui/Button";
import { isOpen } from "@/lib/inspections/types";

export const metadata: Metadata = {
  title: "Inspections",
  robots: { index: false, follow: false },
};

/**
 * EVERY INSPECTION SOMEBODY HAS ASKED YOU FOR.
 *
 * The full list behind the dashboard's section. Two groups and only two: the
 * ones waiting on somebody, and the ones that are done. That split is the
 * whole information design of this screen - an agent opening it wants to know
 * what they are late on, and everything else is history.
 *
 * The open group is not sorted by date. It is sorted by arrival, newest first,
 * which is what the read returns, because the question is "what have I not
 * answered" and not "what is soonest". An inspection on Saturday that has already
 * been confirmed needs nothing; one that came in an hour ago for next month
 * does.
 */
export default async function AgentInspectionsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const context = await getAgentContext();

  if (context.state !== "agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/inspections" profile={null}>
        <EmptyState
          icon="calendar-check"
          title="Inspections live behind an approved profile"
          body="Once your Listing or selling profile is approved, every request to inspect one of your properties arrives here with a state on it that the other side can see too."
          action={
            <ButtonLink href="/profile/setup/owner" variant="primary" size="lg">
              Set up this profile
            </ButtonLink>
          }
        />
      </AgentShell>
    );
  }

  const [list, session] = await Promise.all([readInspectionsForLister(), resolveSession()]);
  const userId = session.state === "signed-in" ? session.user.id : null;
  const open = list.inspections.filter((one) => isOpen(one.state));
  const settled = list.inspections.filter((one) => !isOpen(one.state));
  const [facts, reports] = await Promise.all([
    readListingFacts(
      list.inspections.map((one) => one.listingId),
      locale,
    ),
    readReportsFor(list.inspections.map((one) => one.id)),
  ]);
  const reportLive = reportStorageLive();
  /* The first one waiting on somebody arrives expanded, as on /inspections;
     failing that the first scheduled one, which is the render's own case. */
  const expanded =
    open[0]?.id ?? list.inspections.find((one) => one.state === "CONFIRMED")?.id ?? null;

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/inspections"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="nf-console">
        {/* F6A8A482 as the lister sees it: the console shell draws the way
            back, so the hero here carries the title and the house only. */}
        <InspectionHero
          back={false}
          sub="Check the property, confirm details, submit your report."
        />
        <InspectionsLive userId={userId} />

        {list.readFailed ? (
          /* The wallet's rule, applied here: an empty list and an unreadable
             one look identical and mean opposite things. */
          <p className={`mt-xl ${TYPE.body}`} role="status">
            We could not load your inspections just now, so this is not showing you an empty
            list that might not be true. Nothing has been lost. Try again in a moment.
          </p>
        ) : list.inspections.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            title="Nobody has asked to inspect a property yet"
            body="When somebody requests an inspection from one of your listings it lands here, and you can confirm it, offer another time, or say no."
            action={
              <ButtonLink href="/agent/listings" variant="primary" size="lg">
                Your properties
              </ButtonLink>
            }
          />
        ) : (
          <Stack className="mt-lg">
            {open.length > 0 && (
              <Section
                title="Waiting on somebody"
                description="These are the ones with a person on the other end of them."
              >
                <div className="nf-ix-list">
                  {open.map((one) => (
                    <InspectionSheet
                      key={one.id}
                      inspection={one}
                      side="lister"
                      facts={facts.get(one.listingId) ?? null}
                      report={reports.get(one.id) ?? null}
                      reportLive={reportLive}
                      locale={locale}
                      open={one.id === expanded}
                    />
                  ))}
                </div>
              </Section>
            )}

            {settled.length > 0 && (
              <Section title="Done" divided={open.length > 0}>
                <div className="nf-ix-list">
                  {settled.map((one) => (
                    <InspectionSheet
                      key={one.id}
                      inspection={one}
                      side="lister"
                      facts={facts.get(one.listingId) ?? null}
                      report={reports.get(one.id) ?? null}
                      reportLive={reportLive}
                      locale={locale}
                      open={one.id === expanded}
                    />
                  ))}
                </div>
              </Section>
            )}
          </Stack>
        )}
      </div>
    </AgentShell>
  );
}
