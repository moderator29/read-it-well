import { getDictionary, type Locale } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { AgentRegisterForm } from "@/components/supply/AgentRegisterForm";

/**
 * The agent registration form, all four screens, for the shape proof.
 *
 * `/profile/setup/agent` sits behind the signed-in gate in `proxy.ts` and the
 * proof server has no session, so this renders the SAME component on the same
 * shell width and a script walks it. Never the proof of the writes.
 */
export const dynamic = "force-dynamic";

export default async function PreviewAgentForm({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ step }, locale]: [{ step?: string }, Locale] = await Promise.all([
    searchParams,
    getLocale(),
  ]);
  const t = getDictionary(locale);
  return (
    <div className="nf-shell py-section-tight">
      <AgentRegisterForm t={t} locale={locale} startAt={Number(step ?? 0) || 0} />
    </div>
  );
}
