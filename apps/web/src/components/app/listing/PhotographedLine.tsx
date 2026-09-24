import { getDictionary, type Locale } from "@vallo/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isShotSlot, photographed, type ShotSlot } from "@/lib/listings/shot-list";

/**
 * V-70. "Photographed: kitchen, prepaid meter, water source." One line from
 * the labels the lister put on this listing's photos, readable by anybody for
 * a published listing. No labels, or a failed read, renders nothing: the line
 * only ever says what a labelled photo shows.
 */
export async function PhotographedLine({ listingId, locale }: { listingId: string; locale: Locale }) {
  if (!isSupabaseConfigured()) return null;
  let slots: ShotSlot[] = [];
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as unknown as {
      from(table: string): { select(cols: string): { eq(col: string, value: string): Promise<{ data: unknown; error: unknown }> } };
    })
      .from("listing_photo_slots")
      .select("slot")
      .eq("listing_id", listingId);
    if (error || !Array.isArray(data)) return null;
    slots = photographed((data as { slot: unknown }[]).map((row) => (isShotSlot(row.slot) ? row.slot : null)));
  } catch {
    return null;
  }
  if (slots.length === 0) return null;
  const copy = getDictionary(locale).afterTheGate.shots;
  return (
    <p className="nf-caption mt-sm" data-testid="listing-photographed">
      {copy.photographed.replace("{slots}", slots.map((slot) => copy.slots[slot].toLowerCase()).join(", "))}
    </p>
  );
}
