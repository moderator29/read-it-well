import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import ConversationPage from "@/app/(app)/messages/[id]/page";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

/**
 * /agent/messages/[id]: a conversation, opened from the agent inbox, inside
 * the agent workspace.
 *
 * The inbox used to link to `/messages/[id]`, which sits under the consumer
 * layout, so an agent on a phone opening an enquiry lost the workspace drawer
 * and landed on the personal dock. This is the SAME screen: the consumer
 * route's page is rendered as-is, so there is one thread reader, one composer
 * and one write path, and every read in it still runs on the caller's own
 * RLS-bound client. Only the chrome differs. Back goes to `/agent/messages`
 * through `lib/nav/route-parents.ts`.
 *
 * Anyone without an agent row is sent to the ordinary address. The thread
 * would render for them just the same (membership is RLS, not this check),
 * but an agent frame round a guest's conversation would say they are
 * somewhere they are not.
 */
export default async function AgentConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attach?: string | string[]; showme?: string | string[] }>;
}) {
  const [{ id }, context] = await Promise.all([params, getAgentContext()]);
  if (context.state !== "agent") redirect(`/messages/${encodeURIComponent(id)}`);

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/messages"
      profile={agentProfileFrom(context.agent)}
      immersive
      chromeBack={false}
    >
      <ConversationPage params={params} searchParams={searchParams} />
    </AgentShell>
  );
}
