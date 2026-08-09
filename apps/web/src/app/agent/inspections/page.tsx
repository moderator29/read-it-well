import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import { readInspectionsForLister } from "@/lib/inspections/queries";
import { InspectionRows } from "@/components/app/inspections/InspectionRows";
import { EmptyState, Section, Stack, TYPE } from "@/components/app/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { isOpen } from "@/lib/inspections/types";

export const metadata: Metadata = {
  title: "Inspections",
  robots: { index: false, follow: false },
};

/**
 * EVERY VIEWING SOMEBODY HAS ASKED YOU FOR.
 *
 * The full list behind the dashboard's section. Two groups and only two: the
 * ones waiting on somebody, and the ones that are done. That split is the
 * whole information design of this screen - an agent opening it wants to know
 * what they are late on, and everything else is history.
 *
 * The open group is not sorted by date. It is sorted by arrival, newest first,
 * which is what the read returns, because the question is "what have I not
 * answered" and not "what is soonest". A viewing on Saturday that has already
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
          body="Once your Listing or selling profile is approved, every request to view one of your properties arrives here with a state on it that the other side can see too."
          action={
            <ButtonLink href="/profile/setup/owner" variant="primary" size="lg">
              Set up this profile
            </ButtonLink>
          }
        />
      </AgentShell>
    );
  }

  const list = await readInspectionsForLister();
  const open = list.inspections.filter((one) => isOpen(one.state));
  const settled = list.inspections.filter((one) => !isOpen(one.state));

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/inspections"
      profile={agentProfileFrom(context.agent)}
    >
      <div className="nf-console">
        <h1 className="nf-h1">Inspections</h1>
        <p className={`mt-1 ${TYPE.bodyLg}`}>
          Somebody wanting to see a property is the closest thing to a deal this platform has.
          Both of you see the same state on the same request.
        </p>

        {list.readFailed ? (
          /* The wallet's rule, applied here: an empty list and an unreadable
             one look identical and mean opposite things. */
          <p className={`mt-8 ${TYPE.body}`}>
            We could not load your inspections just now, so this is not showing you an empty
            list that might not be true. Nothing has been lost. Try again in a moment.
          </p>
        ) : list.inspections.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            title="Nobody has asked to view a property yet"
            body="When somebody requests an inspection from one of your listings it lands here, and you can confirm it, offer another time, or say no."
            action={
              <ButtonLink href="/agent/listings" variant="primary" size="lg">
                Your properties
              </ButtonLink>
            }
          />
        ) : (
          <Stack className="mt-8">
            {open.length > 0 && (
              <Section
                title="Waiting on somebody"
                description="These are the ones with a person on the other end of them."
              >
                <InspectionRows inspections={open} side="lister" locale={locale} />
              </Section>
            )}

            {settled.length > 0 && (
              <Section title="Done" divided={open.length > 0}>
                <InspectionRows inspections={settled} side="lister" locale={locale} />
              </Section>
            )}
          </Stack>
        )}
      </div>
    </AgentShell>
  );
}
