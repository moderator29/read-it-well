import type { Dictionary } from "@vallo/i18n";

/**
 * V-60, THE PURE HALF: reading the two answers `scam_recall_preview` and
 * `scam_recall_send` give. Anything unrecognised is a failure, never a send.
 */

export type RecallPreview = {
  audience: number;
  lifted: boolean;
  /** The recall already sent for this stop, if there was one. */
  sent: { at: string; to: number; category: string } | null;
};

export function recallPreviewFrom(data: unknown): RecallPreview | null {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  if (typeof r.audience !== "number") return null;
  const sent =
    typeof r.sent_at === "string"
      ? { at: r.sent_at, to: typeof r.sent_to === "number" ? r.sent_to : 0, category: String(r.category ?? "") }
      : null;
  return { audience: r.audience, lifted: r.lifted === true, sent };
}

export function recallSendFrom(
  data: unknown,
  desk: Dictionary["trustVisible"]["desk"],
): { ok: true; recipients: number } | { ok: false; message: string } {
  const r = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  const status = typeof r?.status === "string" ? r.status : "";
  if (status === "sent" && typeof r?.recipients === "number") return { ok: true, recipients: r.recipients };
  if (status === "forbidden") return { ok: false, message: desk.recallForbidden };
  if (status === "lifted") return { ok: false, message: desk.recallLifted };
  if (status === "already") return { ok: false, message: desk.recallAlready };
  return { ok: false, message: desk.recallFailed };
}

/** "This will tell 14 people", in the desk's words. */
export function willTell(audience: number, desk: Dictionary["trustVisible"]["desk"]): string {
  if (audience <= 0) return desk.recallNobody;
  return audience === 1 ? desk.recallWillTellOne : desk.recallWillTell.replace("{count}", String(audience));
}
