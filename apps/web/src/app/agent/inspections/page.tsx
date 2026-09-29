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
import { readRentGateFor, readReportsFor } from "@/lib/inspections/report-queries";
import { reportStorageLive } from "@/lib/inspections/report-flag";
import { ButtonLink } from "@/components/ui/Button";
import { isOpen } from "@/lib/inspections/types";
import { SUPPLY_DOOR_HREF } from "@/components/agent/agent-doors";
import { readMyListings } from "@/lib/agent/listings-queries";
import { readMyViewingWindows } from "@/lib/viewings/queries";
import { lagosDay, nextStop, routeFor } from "@/lib/viewings/route";
import { ViewingWindows } from "@/components/agent/ViewingWindows";
import { SaturdayRoute } from "@/components/agent/SaturdayRoute";
import { formatDate } from "@vallo/i18n";

/** Lagos today, from the clock, once per request (V-94). */
function lagosToday(): { day: string; now: number } {
  const now = Date.now();
  return { day: lagosDay(now), now };
}

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
          title="Inspections open once you are approved"
          body="Once your Listing or selling profile is approved, every request to inspect one of your properties arrives here with a state on it that the other side can see too."
          action={
            <ButtonLink href={SUPPLY_DOOR_HREF} variant="primary" size="lg">
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
  const [facts, reports, rentGate] = await Promise.all([
    readListingFacts(
      list.inspections.map((one) => one.listingId),
      locale,
    ),
    readReportsFor(list.inspections.map((one) => one.id)),
    readRentGateFor(list.inspections.map((one) => one.id)),
  ]);
  const reportLive = reportStorageLive();

  /* V-94: the lister's viewing windows, and the first day from today with
     booked viewings drawn as a route (today when there are none). */
  const [windows, mine] = await Promise.all([
    readMyViewingWindows(),
    /* A failed read is null, never "no published homes". */
    readMyListings(context.supabase, context.agent.id).catch(() => null),
  ]);
  const homes = mine === null ? null : mine.filter((one) => one.status === "PUBLISHED").map((one) => ({ id: one.id, title: one.title }));
  const areaOf = new Map((mine ?? []).map((one) => [one.id, one.area]));
  const clock = lagosToday();
  const booked = list.inspections.filter(
    (one) => one.state === "CONFIRMED" && one.slotAt !== null && lagosDay(one.slotAt) >= clock.day,
  );
  const routeDay = booked.map((one) => lagosDay(one.slotAt!)).sort()[0] ?? clock.day;
  const route = routeFor(
    booked
      .filter((one) => lagosDay(one.slotAt!) === routeDay)
      .map((one) => ({
        inspectionId: one.id,
        listingId: one.listingId,
        listingTitle: one.listingTitle,
        area: areaOf.get(one.listingId) ?? null,
        slotAt: one.slotAt!,
        counterpartName: one.counterpartName,
        conversationId: one.conversationId,
      })),
  );
  const routeLabel = formatDate(new Date(`${routeDay}T12:00:00+01:00`), locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
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

        {/* V-94: the day as a route, and the windows renters book into. */}
        <SaturdayRoute
          dayLabel={routeLabel}
          route={route}
          next={routeDay === clock.day ? nextStop(route, clock.now) : null}
          copy={t.frontDoor.viewings}
          locale={locale}
        />
        <ViewingWindows windows={windows} homes={homes} copy={t.frontDoor.viewings} />

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
            title="No inspection requests yet"
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
                      gateCopy={t.platform.gate}
                      key={one.id}
                      inspection={one}
                      side="lister"
                      facts={facts.get(one.listingId) ?? null}
                      report={reports.get(one.id) ?? null}
                      reportLive={reportLive}
                      needPhotos={rentGate.needPhotos}
                      agreement={rentGate.agreements.get(one.id) ?? null}
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
                      gateCopy={t.platform.gate}
                      key={one.id}
                      inspection={one}
                      side="lister"
                      facts={facts.get(one.listingId) ?? null}
                      report={reports.get(one.id) ?? null}
                      reportLive={reportLive}
                      needPhotos={rentGate.needPhotos}
                      agreement={rentGate.agreements.get(one.id) ?? null}
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
