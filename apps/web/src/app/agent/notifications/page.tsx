import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentShell } from "@/components/agent/AgentShell";
import { agentProfileFrom, getAgentContext } from "@/lib/agent/listings-queries";
import NotificationsPage from "@/app/(app)/notifications/page";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

/**
 * /agent/notifications: the agent bell's destination, inside the workspace.
 *
 * The bell used to open `/notifications` under the consumer layout, so on a
 * phone the workspace drawer disappeared one tap after the agent reached for
 * it. The list is the consumer route's page rendered unchanged (the caller's
 * own rows under RLS, realtime arrivals, the read-state grant); only the frame
 * is the workspace's. Its back control is the list's own `PageHeader`, which
 * resolves to `/agent/dashboard` through `lib/nav/route-parents.ts`.
 *
 * Without an agent row there is no workspace to keep, so this is the ordinary
 * address.
 */
export default async function AgentNotificationsPage() {
  const context = await getAgentContext();
  if (context.state !== "agent") redirect("/notifications");

  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <AgentShell
      t={t}
      locale={locale}
      active="/agent/notifications"
      profile={agentProfileFrom(context.agent)}
      chromeBack={false}
    >
      <NotificationsPage />
    </AgentShell>
  );
}
