import "server-only";

/**
 * How long it takes to get there from where somebody is standing.
 *
 * Restaurants are the one category where distance decides the booking. Nobody
 * cross-references a hotel against their current position, but "can I be there
 * by eight" is the entire question about dinner, and in Lagos the honest answer
 * has almost nothing to do with how far away it is. Ikoyi to Lekki is eight
 * kilometres and it is either fifteen minutes or an hour and a half.
 *
 * Which is why this calls the Routes API instead of doing the arithmetic. A
 * straight-line distance dressed up as a duration would be a number we invented
 * printed next to a real address, and it would be most wrong exactly when
 * somebody most needs it, at six on a Friday on the Lekki-Epe expressway. The
 * platform deleted a whole seed catalogue over this principle, so it is not
 * about to start guessing travel times.
 *
 * ## What happens without a key
 *
 * Nothing, honestly. `TRAFFIC_UNAVAILABLE` comes back, the card shows the
 * distance it can prove and no duration, and no request is made. This is the
 * same rule the partner providers follow: a missing credential is a normal
 * state of this codebase, not a failure, and it never breaks a page.
 *
 * ## The key
 *
 * Google enables APIs per project rather than per credential, so the Places key
 * already in the environment works for Routes as soon as Routes is enabled on
 * the same project. `GOOGLE_ROUTES_API_KEY` exists only as an override, for
 * when it becomes worth giving the two APIs separate quotas and restrictions.
 * Unset, and the Places key is used, so this needs no new configuration at all.
 *
 * One trap worth writing down, because the error message does not say it: if
 * the Places key carries API restrictions, it is almost certainly restricted to
 * the Places API alone, and Routes will answer 403 until it is added to that
 * same allow-list. That failure looks like a broken key rather than an unticked
 * box.
 */

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** The whole call, including connect. Beyond this a card is better off plain. */
const BUDGET_MS = 2_000;

/**
 * Only the two fields we use, which is also what we are billed on.
 *
 * The Routes API requires a field mask and refuses a request without one. That
 * is a feature here: asking for the whole route object would bill for a
 * polyline nobody draws.
 */
const FIELD_MASK = "routes.duration,routes.distanceMeters";

/** Past this, driving time is not what is stopping somebody going for dinner. */
const MAX_SENSIBLE_METRES = 120_000;

export type LatLng = { lat: number; lng: number };

export type TravelTime =
  | { outcome: "ok"; seconds: number; metres: number }
  /** No key, or Routes is not enabled. No call was made. */
  | { outcome: "unavailable" }
  /** There is no drivable route, which happens across water and to bad geocodes. */
  | { outcome: "no_route" }
  /** Called and failed. `reason` is for the server log, never for a visitor. */
  | { outcome: "error"; reason: string };

function apiKey(): string | null {
  const key = process.env.GOOGLE_ROUTES_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";
  return key.length > 0 ? key : null;
}

/** True when a travel time can be asked for at all. Cheap, synchronous. */
export function travelTimeConfigured(): boolean {
  return apiKey() !== null;
}

/**
 * A coordinate that could plausibly be a person in Nigeria.
 *
 * Browsers hand back a position from whatever the device believes, and a device
 * that believes it is at the origin off the coast of Ghana is common enough to
 * be worth refusing: 0,0 is what a failed fix looks like, not where anybody is.
 * A bad origin costs a billed request and returns a duration from the Gulf of
 * Guinea, which would render as a perfectly confident four hour drive.
 */
export function isPlausibleOrigin(at: LatLng): boolean {
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return false;
  if (at.lat === 0 && at.lng === 0) return false;
  return at.lat >= -90 && at.lat <= 90 && at.lng >= -180 && at.lng <= 180;
}

/**
 * Driving time from one point to another, in current traffic.
 *
 * `TRAFFIC_AWARE` rather than the optimal setting, deliberately. The optimal
 * one costs more per request and buys precision that is meaningless against
 * the thing being predicted, which is Lagos traffic twenty minutes from now.
 *
 * Never throws. Every failure is an outcome.
 */
export async function drivingTime(from: LatLng, to: LatLng): Promise<TravelTime> {
  const key = apiKey();
  if (!key) return { outcome: "unavailable" };
  if (!isPlausibleOrigin(from) || !isPlausibleOrigin(to)) return { outcome: "no_route" };

  try {
    const response = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: from.lat, longitude: from.lng } } },
        destination: { location: { latLng: { latitude: to.lat, longitude: to.lng } } },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        // Nigeria drives on the right and measures in kilometres. Both are sent
        // rather than left to a default that follows the billing account.
        regionCode: "NG",
        units: "METRIC",
      }),
      signal: AbortSignal.timeout(BUDGET_MS),
      // A travel time is true for minutes, and caching one would show somebody
      // this morning's traffic this evening.
      cache: "no-store",
    });

    if (!response.ok) {
      return { outcome: "error", reason: `routes answered ${response.status}` };
    }

    const body: unknown = await response.json();
    const routes = (body as { routes?: unknown })?.routes;
    const first = Array.isArray(routes) ? routes[0] : null;
    if (typeof first !== "object" || first === null) return { outcome: "no_route" };

    const route = first as { duration?: unknown; distanceMeters?: unknown };

    /* Durations arrive as a protobuf duration string, seconds with a trailing
       "s" ("1043s"). Parsed strictly rather than with parseInt, because
       parseInt("nonsense") is NaN but parseInt("12abc") is 12, and a silently
       truncated number here becomes a confident wrong ETA. */
    const raw = typeof route.duration === "string" ? route.duration : "";
    const match = /^(\d{1,7})(?:\.\d+)?s$/.exec(raw);
    if (!match) return { outcome: "no_route" };
    const seconds = Number(match[1]);

    const metres = typeof route.distanceMeters === "number" ? route.distanceMeters : 0;
    if (metres > MAX_SENSIBLE_METRES) return { outcome: "no_route" };

    return { outcome: "ok", seconds, metres };
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    if (name === "TimeoutError" || name === "AbortError") {
      return { outcome: "error", reason: "routes timed out" };
    }
    return { outcome: "error", reason: "routes unreachable" };
  }
}

/**
 * A duration a person would say out loud.
 *
 * Rounded to five minutes below an hour, because a travel time predicted
 * through traffic is not accurate to the minute and printing "23 min" claims a
 * precision this number does not have. Never rounds down to zero: somewhere
 * two minutes away still takes a couple of minutes to reach.
 */
export function spokenDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    const rounded = minutes < 5 ? minutes : Math.round(minutes / 5) * 5;
    return `${rounded} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round((minutes % 60) / 15) * 15;
  if (rest === 0 || rest === 60) return `${rest === 60 ? hours + 1 : hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** A distance a person would say out loud. Metres below a kilometre. */
export function spokenDistance(metres: number): string {
  if (metres < 950) return `${Math.max(50, Math.round(metres / 50) * 50)} m`;
  return `${(metres / 1000).toFixed(metres < 9_500 ? 1 : 0)} km`;
}
