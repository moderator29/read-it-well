import type { SupabaseClient } from "@supabase/supabase-js";
import { getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import { bpsAsPercentText } from "@/lib/money/percent";

/**
 * V-36. A lister's caution record, on their listing: how many cautions they
 * settled through Vallo, how many on time, and the average share kept for
 * agreed repairs. `lister_caution_record` answers only once five have
 * settled, so a record is never read off one or two tenancies; below that,
 * and for a signed-out reader or a failed read, this renders nothing.
 */
export async function CautionRecordLine({ listingId, listerName, locale }: { listingId: string; listerName: string | null; locale: Locale }) {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const loose = session.supabase as unknown as SupabaseClient;
  let row: Record<string, unknown> | null = null;
  try {
    const { data: listing } = await loose.from("listings").select("agent_id").eq("id", listingId).maybeSingle();
    const agentId = (listing as { agent_id?: string } | null)?.agent_id;
    const { data: agent } = agentId
      ? await loose.from("agents").select("user_id").eq("id", agentId).maybeSingle()
      : { data: null };
    const listerId = (agent as { user_id?: string } | null)?.user_id;
    if (listerId) {
      const { data, error } = await loose.rpc("lister_caution_record", { p_lister: listerId });
      row = !error && typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
    }
  } catch {
    row = null;
  }
  if (!row) return null;
  const settled = Number(row.settled);
  const onTime = Number(row.on_time);
  const bps = Number(row.average_deduction_bps);
  if (!Number.isInteger(settled) || settled < 5 || !Number.isInteger(onTime) || !Number.isFinite(bps)) return null;
  const copy = getDictionary(locale).afterTheGate.cautionRecord;
  return (
    <p className="nf-body-sm nf-numeric mt-md" data-testid="caution-record">
      {copy.line
        .replace("{name}", listerName?.trim() || copy.theLister)
        .replace("{settled}", String(settled))
        .replace("{onTime}", String(onTime))
        .replace("{deduction}", bpsAsPercentText(bps))}
    </p>
  );
}
