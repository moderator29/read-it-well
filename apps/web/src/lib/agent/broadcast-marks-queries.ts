import "server-only";

/**
 * V-09: the unconfirmed set for one draft, under the caller's own client
 * (owner only by policy). No row is an empty list; A FAILED READ IS NULL, and
 * the submit gate refuses on null (it fails closed: a figure nobody could
 * prove was checked is treated as unchecked).
 */

type Client = {
  from: (table: "listing_broadcast_marks") => {
    select: (cols: "unconfirmed") => {
      eq: (col: "listing_id", value: string) => {
        maybeSingle: () => PromiseLike<{ data: { unconfirmed: unknown } | null; error: unknown }>;
      };
    };
  };
};

export async function readBroadcastMarks(supabase: unknown, listingId: string): Promise<string[] | null> {
  try {
    const { data, error } = await (supabase as Client)
      .from("listing_broadcast_marks")
      .select("unconfirmed")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (error) return null;
    if (!data) return [];
    if (!Array.isArray(data.unconfirmed)) return null;
    return data.unconfirmed.filter((key): key is string => typeof key === "string");
  } catch {
    return null;
  }
}

type Writer = {
  from: (table: "listing_broadcast_marks") => {
    delete: () => { eq: (col: string, value: string) => PromiseLike<{ error: unknown }> };
    upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => PromiseLike<{ error: unknown }>;
  };
};

/** Write (or, when empty, clear) the set beside the draft. True when it stuck. */
export async function writeBroadcastMarks(supabase: unknown, listingId: string, keys: readonly string[]): Promise<boolean> {
  const db = supabase as Writer;
  const unique = [...new Set(keys)].sort();
  try {
    const { error } =
      unique.length === 0
        ? await db.from("listing_broadcast_marks").delete().eq("listing_id", listingId)
        : await db
            .from("listing_broadcast_marks")
            .upsert({ listing_id: listingId, unconfirmed: unique, updated_at: new Date().toISOString() }, { onConflict: "listing_id" });
    return !error;
  } catch {
    return false;
  }
}
