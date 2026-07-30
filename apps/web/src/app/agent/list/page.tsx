import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { getAgentRepository } from "@/lib/agent/repository";
import { AgentShell } from "@/components/agent/AgentShell";
import {
  agentProfileFrom,
  getAgentContext,
  readAmenities,
  readDraft,
  readStates,
  type WizardDraft,
} from "@/lib/agent/listings-queries";
import { AMENITY_CHOICES, STATE_CODES } from "@/lib/agent/listings-schema";
import { ListingWizard } from "./ListingWizard";
import { ListingPitch } from "./ListingPitch";

export const metadata: Metadata = {
  title: "List a property",
  robots: { index: false, follow: false },
};

/**
 * /agent/list: the supply loop's front door.
 *
 * Three honest states. An approved agent gets the seven step wizard, loaded
 * with the platform's states and amenities and, when `?id=` names one of their
 * drafts, with that draft restored. A signed-in visitor who is not an agent,
 * and anyone signed out, gets the pitch and a route to the application. When
 * the platform keys are not in place the wizard still opens, saving to the
 * device, with a calm banner saying what switches on later.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const { id } = await searchParams;
  const context = await getAgentContext();

  if (context.state === "signed-out" || context.state === "not-agent") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/list" profile={profile}>
        <ListingPitch signedIn={context.state === "not-agent"} />
      </AgentShell>
    );
  }

  // Without platform keys there is nothing to read, so the wizard opens on the
  // canonical reference lists and keeps the agent's work on their device.
  if (context.state === "unconfigured") {
    const profile = await getAgentRepository().getProfile();
    return (
      <AgentShell t={t} locale={locale} active="/agent/list" profile={profile}>
        <ListingWizard
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
      : Promise.resolve<WizardDraft | null>(null),
  ]);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/list"
      profile={agentProfileFrom(context.agent)}
    >
      <ListingWizard
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
