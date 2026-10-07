import type { Metadata } from "next";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { HostShell } from "@/components/host/HostShell";
import { WorkspaceAssistant } from "@/components/workspace/WorkspaceAssistant";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDictionary(await getLocale()).hostNav.assistant, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/**
 * /host/assistant: Vallo AI inside the host workspace, for a hotel, a guest
 * house, serviced apartments, a shortlet or a restaurant. The same concierge
 * as `/assistant`, framed by the host shell and told by key that it is
 * speaking to a host (`lib/assistant/workspace.ts`).
 */
export default async function HostAssistantPage() {
  const locale = await getLocale();
  return (
    <HostShell fallback="/host" immersive>
      <WorkspaceAssistant workspace="host" locale={locale} />
    </HostShell>
  );
}
