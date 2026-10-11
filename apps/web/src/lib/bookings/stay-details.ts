/**
 * D75: what the trip page reveals about the place, after payment.
 *
 * The database decides (`public.my_stay_details`, migration d75b): to the
 * booking's own guest only, once a payment has settled, while the stay is
 * CONFIRMED or COMPLETED. Before payment it answers `unpaid` and reveals
 * nothing; the gate code is withheld once the stay is over. This file only
 * reads that answer and shapes it. A failed read (including before the
 * migration is applied) is `unavailable`, and the page simply shows nothing.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type StayDetails =
  | {
      state: "ready";
      kind: "listing" | "room";
      placeName: string;
      address: string | null;
      areaCity: string;
      checkInFrom: string | null;
      checkOutBy: string | null;
      houseRules: string | null;
      estateName: string | null;
      gateDirections: string | null;
      securityPhone: string | null;
      accessCode: string | null;
      hostName: string | null;
      messageHref: string;
    }
  | { state: "unpaid" | "not_confirmed" | "not_found" | "unavailable" };

const text = (v: unknown): string | null => (typeof v === "string" && v.trim().length > 0 ? v.trim() : null);

/** Shape the database's answer. Pure, so every branch is a unit test. */
export function parseStayDetails(data: unknown): StayDetails {
  if (!data || typeof data !== "object") return { state: "unavailable" };
  const d = data as Record<string, unknown>;
  if (d.status === "unpaid" || d.status === "not_confirmed" || d.status === "not_found") return { state: d.status };
  if (d.status !== "ok") return { state: "unavailable" };
  const href = text(d.message_href);
  /* Only the two shapes the function writes are followed: never an outside link. */
  if (!href || !/^\/(messages\/new\?listing=|stay\/)[0-9a-f-]{36}$/.test(href)) return { state: "unavailable" };
  const hhmm = (v: unknown) => (text(v) ? text(v)!.slice(0, 5) : null);
  return {
    state: "ready",
    kind: d.kind === "room" ? "room" : "listing",
    placeName: text(d.place_name) ?? "Your stay",
    address: text(d.address),
    areaCity: [text(d.area), text(d.city)].filter(Boolean).join(", "),
    checkInFrom: hhmm(d.check_in_from),
    checkOutBy: hhmm(d.check_out_by),
    houseRules: text(d.house_rules),
    estateName: text(d.estate_name),
    gateDirections: text(d.gate_directions),
    securityPhone: text(d.security_phone),
    accessCode: text(d.access_code),
    hostName: text(d.host_name),
    messageHref: href,
  };
}

/** Read through the guest's own session client. */
export async function readStayDetails(supabase: SupabaseClient, bookingId: string): Promise<StayDetails> {
  try {
    const { data, error } = await supabase.rpc("my_stay_details", { p_booking: bookingId });
    if (error) return { state: "unavailable" };
    return parseStayDetails(data);
  } catch {
    return { state: "unavailable" };
  }
}
