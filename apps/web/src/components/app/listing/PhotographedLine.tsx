import { getDictionary, type Locale } from "@vallo/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { claimsOf, isShotSlot, photographedClaimed, type ShotSlot } from "@/lib/listings/shot-list";

type Loose = {
  from(table: string): {
    select(cols: string): {
      eq(col: string, value: string): Promise<{ data: unknown; error: unknown }> & {
        maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

/**
 * V-70. "Photographed: kitchen, prepaid meter, water source." One line from
 * the labels the lister put on this listing's photos, readable by anybody for
 * a published listing. A meter, water or power label shows only while the
 * listing still claims it; an example listing gets no line. No labels, or a
 * failed read, renders nothing: the line only ever says what a labelled
 * photo shows.
 */
export async function PhotographedLine({ listingId, locale }: { listingId: string; locale: Locale }) {
  if (!isSupabaseConfigured()) return null;
  let slots: ShotSlot[] = [];
  try {
    const supabase = (await createClient()) as unknown as Loose;
    const [listing, labels] = await Promise.all([
      supabase.from("listings").select("is_demo, prepaid_meter, water_supply, power_backup").eq("id", listingId).maybeSingle(),
      supabase.from("listing_photo_slots").select("slot").eq("listing_id", listingId),
    ]);
    const row = listing.data as Record<string, unknown> | null;
    if (listing.error || !row || row.is_demo === true) return null;
    if (labels.error || !Array.isArray(labels.data)) return null;
    slots = photographedClaimed(
      (labels.data as { slot: unknown }[]).map((label) => (isShotSlot(label.slot) ? label.slot : null)),
      claimsOf(row),
    );
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
