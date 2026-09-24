/**
 * WHAT YOU PAID IS RESOLVED, VISIBLY. V-40, the money half.
 *
 * Money is never queued. What is kept is a NOTE: the moment a Paystack
 * checkout opens, its reference is written here (`localStorage`,
 * `vallo.inflight`), before a card can be presented. If the popup dies, the
 * app is killed or the network drops between charge and confirm, the note
 * survives, and on every app start and every `online` event
 * `InflightResolver` asks the server what happened to that reference
 * (`paymentState`, the same owner-only, rate-limited read the checkout polls)
 * and says so: paid, failed, or "Paystack has not told us yet; do not pay
 * again". A terminal answer clears the note. A note older than two days is
 * dropped: by then the reconcile job has settled it and the history says so.
 */

export const INFLIGHT_KEY = "vallo.inflight";
export const INFLIGHT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type Inflight = { reference: string; amountMinor: number | null; at: number };

export function readInflight(raw: string | null, now: number): Inflight[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is Inflight =>
          !!x &&
          typeof (x as Inflight).reference === "string" &&
          /^[A-Za-z0-9_-]{6,120}$/.test((x as Inflight).reference) &&
          typeof (x as Inflight).at === "number",
      )
      .map((x) => ({ reference: x.reference, amountMinor: typeof x.amountMinor === "number" ? x.amountMinor : null, at: x.at }))
      .filter((x) => now - x.at < INFLIGHT_MAX_AGE_MS)
      .slice(-10);
  } catch {
    return [];
  }
}

function load(now: number): Inflight[] {
  try {
    return readInflight(window.localStorage.getItem(INFLIGHT_KEY), now);
  } catch {
    return [];
  }
}

function store(items: Inflight[]): void {
  try {
    if (items.length === 0) window.localStorage.removeItem(INFLIGHT_KEY);
    else window.localStorage.setItem(INFLIGHT_KEY, JSON.stringify(items));
  } catch {
    /* Storage refused: the checkout's own polling still settles the payment. */
  }
}

/** Written before the checkout opens. */
export function noteInflight(reference: string, amountMinor: number | null, now: number = Date.now()): void {
  if (typeof window === "undefined") return;
  const items = load(now).filter((x) => x.reference !== reference);
  items.push({ reference, amountMinor, at: now });
  store(items);
}

/** Cleared on a terminal answer. */
export function clearInflight(reference: string): void {
  if (typeof window === "undefined") return;
  store(load(Date.now()).filter((x) => x.reference !== reference));
}

export function listInflight(now: number = Date.now()): Inflight[] {
  if (typeof window === "undefined") return [];
  return load(now);
}

export function clearAllInflight(): void {
  store([]);
}
