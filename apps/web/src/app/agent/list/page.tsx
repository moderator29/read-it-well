import type { Metadata } from "next";
import { getDictionary } from "@naijafinds/i18n";
import { getLocale } from "@/lib/locale";
import { AgentComingSoon } from "@/components/agent/AgentComingSoon";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  const t = getDictionary(await getLocale());
  return <AgentComingSoon active="/agent/list" title={t.agent.nav.listApartment} icon="booking" />;
}
