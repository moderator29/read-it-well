import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * THE CAUTION DESK'S READ. V-36.
 *
 * Vallo never holds a caution: it was paid to the lister with the move-in
 * total and is paid back between the parties. What a person at Vallo rules on
 * is the record: a deduction the tenant disputed (how much of it stands), and
 * a return the lister recorded that the tenant says never arrived (whether it
 * was received). `public.admin_caution_desk` answers both lists and checks the
 * caller's own `guarantee` scope, so it runs as the operator's session. The
 * move-out photograph a deduction cites is signed through the service client
 * for a short while, as every other admin evidence view is.
 */

export type CautionDispute = {
  deductionId: string;
  rentPaymentId: string;
  item: string;
  amountMinor: number;
  cautionMinor: number;
  note: string | null;
  disputedAt: string | null;
  photoUrl: string | null;
};

export type ContestedReturn = {
  returnId: string;
  rentPaymentId: string;
  amountMinor: number;
  returnedOn: string;
  method: string;
  reference: string | null;
  contestNote: string;
  contestedAt: string | null;
};

export type CautionDesk =
  | { state: "ok"; disputes: CautionDispute[]; returns: ContestedReturn[] }
  | { state: "forbidden" }
  | { state: "unavailable" };

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function minor(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0 ? n : null;
}

/** Pure: the desk's jsonb, read defensively. A malformed row is dropped. */
export function readCautionDeskPayload(raw: unknown): CautionDesk {
  if (typeof raw !== "object" || raw === null) return { state: "unavailable" };
  const body = raw as Row;
  if (body.status === "forbidden") return { state: "forbidden" };
  if (body.status !== "ok") return { state: "unavailable" };
  const list = (value: unknown): Row[] => (Array.isArray(value) ? value.filter((r): r is Row => typeof r === "object" && r !== null) : []);
  const disputes = list(body.disputes).flatMap((r): CautionDispute[] => {
    const id = text(r.deduction_id);
    const rp = text(r.rent_payment_id);
    const amount = minor(r.amount_minor);
    const caution = minor(r.caution_minor);
    if (!id || !rp || amount === null || caution === null) return [];
    return [
      {
        deductionId: id,
        rentPaymentId: rp,
        item: text(r.item) ?? "overall",
        amountMinor: amount,
        cautionMinor: caution,
        note: text(r.note),
        disputedAt: text(r.disputed_at),
        photoUrl: text(r.photo_path),
      },
    ];
  });
  const returns = list(body.contested_returns).flatMap((r): ContestedReturn[] => {
    const id = text(r.return_id);
    const rp = text(r.rent_payment_id);
    const amount = minor(r.amount_minor);
    const on = text(r.returned_on);
    if (!id || !rp || amount === null || !on) return [];
    return [
      {
        returnId: id,
        rentPaymentId: rp,
        amountMinor: amount,
        returnedOn: on,
        method: text(r.method) ?? "other",
        reference: text(r.reference),
        contestNote: text(r.contest_note) ?? "",
        contestedAt: text(r.contested_at),
      },
    ];
  });
  return { state: "ok", disputes, returns };
}

/**
 * `caller` is the operator's own client (the function decides on auth.uid());
 * `storage` signs the photographs (the service client for staff).
 */
export async function readCautionDesk(caller: SupabaseClient, storage: SupabaseClient): Promise<CautionDesk> {
  try {
    const { data, error } = await caller.rpc("admin_caution_desk");
    if (error) return { state: "unavailable" };
    const desk = readCautionDeskPayload(data);
    if (desk.state !== "ok") return desk;
    // `photoUrl` holds the storage path until it is signed here.
    const paths = desk.disputes.map((d) => d.photoUrl).filter((p): p is string => p !== null).slice(0, 50);
    const signed = new Map<string, string>();
    if (paths.length > 0) {
      const { data: urls } = await storage.storage.from("tenancy-evidence").createSignedUrls(paths, 600);
      for (const entry of urls ?? []) if (entry.path && entry.signedUrl) signed.set(entry.path, entry.signedUrl);
    }
    return {
      ...desk,
      disputes: desk.disputes.map((d) => ({ ...d, photoUrl: d.photoUrl ? (signed.get(d.photoUrl) ?? null) : null })),
    };
  } catch {
    return { state: "unavailable" };
  }
}
