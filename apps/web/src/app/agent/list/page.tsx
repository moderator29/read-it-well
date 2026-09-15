import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import {
  agentProfileFrom,
  getAgentContext,
  readAmenities,
  readDraft,
  readOpenDraft,
  readStates,
  type WizardDraft,
} from "@/lib/agent/listings-queries";
import { AMENITY_CHOICES, STATE_CODES } from "@/lib/agent/listings-schema";
import { ListingWizard } from "./ListingWizard";
import { ListingPitch } from "./ListingPitch";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.agent.nav.listApartment, robots: { index: false, follow: false } };
}

/**
 * /agent/list: the supply loop's front door.
 *
 * Three honest states. An approved agent gets the seven step wizard, loaded
 * with the platform's states and amenities and, when `?id=` names one of their
 * drafts, with that draft restored. A signed-in visitor who is not an agent,
 * and anyone signed out, gets the pitch and a route to the application. When
 * the platform keys are not in place the wizard still opens, saving to the
 * device, with a calm banner saying what switches on later.
 *
 * WITH NO `?id=`, THIS RESUMES THE HOST'S MOST RECENT DRAFT rather than opening
 * a blank one. This route is the only entry the navigation offers ("List
 * Apartment"), so a blank form here was the default answer to "I came back to
 * finish my listing", and it was the wrong one twice over: the host saw none of
 * their work, and the wizard, having no id, filed a second listings row on the
 * next save while the photos they had already uploaded stayed attached to the
 * first. Two half listings and an apparent data loss, from closing a tab.
 * `readOpenDraft` explains which draft is chosen and why.
 *
 * `?new=1` is the way to a blank wizard, so resuming is never a trap. It is not
 * a dead end for anyone: a host who genuinely wants a second listing while one
 * is unfinished can reach it, and nothing about the resumed draft is hidden
 * from them, since the workspace lists every draft they own.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id, new: startFresh } = await searchParams;
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/list" profile={null}>
        <ListingPitch
          copy={t.agentListings.pitch}
          signedIn={context.state === "not-agent"}
        />
      </AgentShell>
    );
  }

  // Without platform keys there is nothing to read, so the wizard opens on the
  // canonical reference lists and keeps the agent's work on their device.
  if (context.state === "unconfigured") {
    return (
      <AgentShell t={t} locale={locale} active="/agent/list" profile={null}>
        <ListingWizard
          copy={t.agentListings}
          locale={locale}
          userId={null}
          states={STATE_CODES.map((code) => ({ code, name: code }))}
          amenities={AMENITY_CHOICES}
          initial={null}
          canPersist={false}
        />
      </AgentShell>
    );
  }

  const [states, amenities, draft] = await Promise.all([
    readStates(context.supabase),
    readAmenities(context.supabase),
    id
      ? readDraft(context.supabase, context.agent.id, id)
      : startFresh
        ? Promise.resolve<WizardDraft | null>(null)
        : readOpenDraft(context.supabase, context.agent.id),
  ]);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/list"
      profile={agentProfileFrom(context.agent)}
    >
      <ListingWizard
        copy={t.agentListings}
        locale={locale}
        userId={context.user.id}
        states={states.length > 0 ? states : STATE_CODES.map((code) => ({ code, name: code }))}
        amenities={amenities}
        initial={draft}
        canPersist
      />
    </AgentShell>
  );
}
