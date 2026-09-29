import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { UiIcon } from "@/design-system/icons/UiIcon";

type Place = { address: string | null; landmark: string | null; latitude: number | null; longitude: number | null; why: string };

/**
 * THE EXACT PLACE, FOR THE PEOPLE WITH A REASON TO GO THERE.
 *
 * Everybody else sees the area and a rounded point. The street address and
 * the exact pin come from `public.listing_exact_location`, which answers only
 * for the lister, staff, a member whose inspection is confirmed or done, or a
 * party to a live agreement. For anybody else it returns no row and this
 * renders nothing. It streams on its own and never holds the page.
 */
export async function ExactPlace({ listingId }: { listingId: string }) {
  if (!isSupabaseConfigured()) return null;
  let place: Place | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = (await supabase.rpc("listing_exact_location" as never, { p_listing: listingId } as never)) as {
      data: unknown;
      error: unknown;
    };
    if (!error && Array.isArray(data) && data.length > 0) place = data[0] as Place;
  } catch {
    return null;
  }
  if (!place || (!place.address && place.latitude === null)) return null;
  const pin =
    place.latitude !== null && place.longitude !== null
      ? `https://www.google.com/maps/search/?api=1&query=${place.latitude.toFixed(6)},${place.longitude.toFixed(6)}`
      : null;
  const lead =
    place.why === "inspection"
      ? "Your viewing is confirmed, so here is exactly where to go."
      : place.why === "agreement"
        ? "You are a party to an agreement on this home, so here is its exact address."
        : "Only you and people with a confirmed viewing or an agreement see this.";
  return (
    <section className="nf-panel nf-panel--card mt-row p-card" data-testid="exact-place" aria-label="Exact address">
      <p className="nf-caption text-[var(--nf-content-secondary)]">{lead}</p>
      {place.address ? <p className="nf-body mt-inline-tight font-semibold">{place.address}</p> : null}
      {place.landmark ? <p className="nf-body mt-inline-tight">Landmark: {place.landmark}</p> : null}
      {pin ? (
        <a
          href={pin}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-inline-tight inline-flex items-center gap-inline font-semibold text-[var(--nf-content-link)] hover:underline"
        >
          <UiIcon name="location" size={16} />
          Open the exact pin in maps
        </a>
      ) : null}
    </section>
  );
}
