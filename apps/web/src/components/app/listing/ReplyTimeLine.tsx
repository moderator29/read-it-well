import type { SupabaseClient } from "@supabase/supabase-js";
import { getDictionary, type Locale } from "@vallo/i18n";
import { resolveSession } from "@/lib/actions/session";
import { replyBandText } from "@/lib/listings/reply-band";
import { UiIcon } from "@/design-system/icons/UiIcon";

/**
 * B7: "Usually replies within a few hours", one muted line under the agent
 * card and on the first-message screen, with a small "How this is measured".
 *
 * The band comes from `public.lister_reply_band`, which answers only with at
 * least 8 counted conversations in 90 days and never with a slow band. Like
 * `CautionRecordLine`, every other outcome renders NOTHING: an example
 * listing, a signed-out reader, a failed read, and the time before the
 * migration `20260930084642_b7_lister_reply_band_only_when_the_record_supports_it.sql`
 * is applied (the RPC does not exist yet, so the read errors).
 */
export async function ReplyTimeLine({ listingId, locale, className = "" }: { listingId: string; locale: Locale; className?: string }) {
  const session = await resolveSession();
  if (session.state !== "signed-in") return null;
  const copy = getDictionary(locale).memberKit.replyTime;
  const loose = session.supabase as unknown as SupabaseClient;
  let text: string | null = null;
  try {
    const { data: listing } = await loose.from("listings").select("agent_id, is_demo").eq("id", listingId).maybeSingle();
    if ((listing as { is_demo?: boolean } | null)?.is_demo === true) return null;
    const agentId = (listing as { agent_id?: string } | null)?.agent_id;
    const { data: agent } = agentId
      ? await loose.from("agents").select("user_id").eq("id", agentId).maybeSingle()
      : { data: null };
    const listerId = (agent as { user_id?: string } | null)?.user_id;
    if (listerId) {
      const { data, error } = await loose.rpc("lister_reply_band", { p_lister: listerId });
      text = error ? null : replyBandText(data, copy);
    }
  } catch {
    text = null;
  }
  if (!text) return null;
  return <ReplyTimeText text={text} how={copy.how} explain={copy.explain} className={className} />;
}

/** The line itself, split out so the preview can draw it from a fixture. */
export function ReplyTimeText({ text, how, explain, className = "" }: { text: string; how: string; explain: string; className?: string }) {
  return (
    <details className={`nf-reply-time ${className}`} data-testid="reply-time">
      <summary className="nf-reply-time__line">
        <UiIcon name="history" size={14} className="shrink-0" />
        <span>{text}</span>
        <span className="nf-reply-time__how">{how}</span>
      </summary>
      <p className="nf-reply-time__explain">{explain}</p>
    </details>
  );
}
