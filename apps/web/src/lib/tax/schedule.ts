/**
 * THE TAX SCHEDULE (handoff 7.10), read side. Rates live in
 * `public.tax_schedule_lines` (migration b3_tax_entitlements_promotion),
 * never here. A line whose rate counsel has not confirmed resolves as
 * `unconfirmed`, and the True Cost Engine shows NO line for it: absent,
 * never guessed, never zero dressed as a rate.
 */

export const TAX_KINDS = [
  "vat_on_vallo_fee",
  "stamp_duty_tenancy",
  "wht_rent_corporate_landlord",
  "cgt_on_sale",
] as const;
export type TaxKind = (typeof TAX_KINDS)[number];

export type TaxLine =
  | { show: true; scheduleLineId: number; rateBps: number; borneBy: string }
  | { show: false; reason: "unconfirmed" | "not_registered" | "no_schedule" | "unreadable" };

/** Read `public.tax_line_at`'s answer. Only `ok` with an integer rate is ever shown. */
export function parseTaxLine(raw: unknown): TaxLine {
  if (!raw || typeof raw !== "object") return { show: false, reason: "unreadable" };
  const r = raw as Record<string, unknown>;
  if (r.status === "unconfirmed" || r.status === "not_registered" || r.status === "no_schedule") {
    return { show: false, reason: r.status };
  }
  const rate = r.rate_bps;
  const id = r.schedule_line_id;
  if (r.status !== "ok" || typeof rate !== "number" || !Number.isSafeInteger(rate) || rate < 0 || typeof id !== "number") {
    return { show: false, reason: "unreadable" };
  }
  return { show: true, scheduleLineId: id, rateBps: rate, borneBy: typeof r.borne_by === "string" ? r.borne_by : "undecided" };
}

type RpcCaller = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

export async function readTaxLine(db: RpcCaller, kind: TaxKind, at?: Date): Promise<TaxLine> {
  try {
    const { data, error } = await db.rpc("tax_line_at", { p_kind: kind, ...(at ? { p_at: at.toISOString() } : {}) });
    return error ? { show: false, reason: "unreadable" } : parseTaxLine(data);
  } catch {
    return { show: false, reason: "unreadable" };
  }
}
