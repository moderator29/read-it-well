import "server-only";

/**
 * V-09: read the unconfirmed set for one draft, under the caller's own client
 * (owner only by policy). A failed or absent read is an empty list: the
 * submit gate on the server reads the row itself and does not rely on this.
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

export async function readBroadcastMarks(supabase: unknown, listingId: string): Promise<string[]> {
  try {
    const { data, error } = await (supabase as Client)
      .from("listing_broadcast_marks")
      .select("unconfirmed")
      .eq("listing_id", listingId)
      .maybeSingle();
    if (error || !data || !Array.isArray(data.unconfirmed)) return [];
    return data.unconfirmed.filter((key): key is string => typeof key === "string");
  } catch {
    return [];
  }
}
