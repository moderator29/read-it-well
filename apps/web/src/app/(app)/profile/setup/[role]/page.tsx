import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { ApplyWizard, type SetupRole } from "@/components/agent/ApplyWizard";
import { ROLE_COPY } from "@/components/roles/roles";
import { PageHeader } from "@/components/app/PageHeader";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

/**
 * SETTING UP A PROFILE YOU SWITCHED INTO.
 *
 * This is where "Become an agent" went, and the move is the point rather than
 * a tidy-up. There is no longer a marketing destination called Become an Agent
 * with a hero, six step cards, an earnings tease and two call-to-action
 * buttons. There is one account with three profiles on it, a sheet that
 * switches between them, and this: the form that finishes a profile the person
 * has already chosen from that sheet.
 *
 * WHY THE ROLE IS IN THE PATH. `/agents/apply` asked, on its first step, which
 * kind of agent you are - the same question the sheet asks, one screen
 * earlier, with a better explanation attached. Two asks, one answer, and
 * nothing reconciling them. The segment carries the answer forward, the wizard
 * locks its type field to it, and the question is asked exactly once.
 *
 * WHY IT LIVES UNDER /profile. Because that is what it is. Switching profile
 * is a profile action, setting one up is the same action taking longer, and a
 * person who abandons this halfway should land back on the screen they started
 * from rather than on a marketing page in the public site chrome.
 *
 * The two segments are the two role ids that can be set up. `renter` is not
 * one of them: there is no application to be a renter and there never will be
 * (see roles.ts), so it 404s here rather than rendering an empty form.
 */
const SETUP_ROLES: readonly SetupRole[] = ["owner", "professional"] as const;

function isSetupRole(value: string): value is SetupRole {
  return (SETUP_ROLES as readonly string[]).includes(value);
}

export default async function ProfileSetupPage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  if (!isSetupRole(role)) notFound();

  const locale = await getLocale();
  const t = getDictionary(locale);
  const copy = ROLE_COPY[role];

  return (
    <div className="mx-auto max-w-3xl">
      {/* The heading is the profile being set up, not the word "application".
          Nobody set out to file an application; they set out to start selling
          or to start working as an agent, and the screen should say the thing
          they were doing. */}
      <PageHeader title={copy.setup.title} fallback="/profile" />

      <p className="nf-lede max-w-[52ch]">{copy.setup.involves}</p>

      <div className="mt-7">
        <ApplyWizard t={t} role={role} />
      </div>
    </div>
  );
}
