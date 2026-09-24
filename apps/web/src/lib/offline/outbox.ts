/**
 * THE OUTBOX: WHAT YOU DID OFFLINE IS KEPT. V-40.
 *
 * A non-money action tapped with no signal (saving or unsaving a listing or a
 * place; sending a message; asking to inspect; writing a review; posting) is
 * written here the moment it is tapped, shown at once
 * with "Waiting for signal", and replayed in order when the connection comes
 * back (`OutboxRunner`). IndexedDB `vallo-outbox`, apart from every other
 * store on the phone.
 *
 * NEVER MONEY. There is no money kind in `OutboxKind` and `enqueue` refuses
 * anything else: a payment is never queued, it is either made with a
 * connection or not started (`lib/offline/inflight.ts` is the other half: a
 * payment that started and lost its connection is resolved, never replayed).
 *
 * REPLAY NEVER DUPLICATES. A save is keyed by what it is about
 * (`save_listing:<listing>`), so a second tap on the same heart replaces the
 * first intent rather than queueing a toggle twice, and it carries the STATE
 * wanted, which the server sets idempotently. A create (a message, a request,
 * a review, a post) is keyed by a UUID minted on the phone when it was tapped;
 * that UUID travels as the action's idempotency key, so a replay after a
 * half-delivered request answers with the first result instead of a second row.
 */

export const SAVE_KINDS = ["save_listing", "save_place"] as const;
export const CREATE_KINDS = ["send_message", "request_inspection", "submit_review", "drop_post"] as const;
export const OUTBOX_KINDS = [...SAVE_KINDS, ...CREATE_KINDS] as const;
export type OutboxKind = (typeof OUTBOX_KINDS)[number];
export type CreateKind = (typeof CREATE_KINDS)[number];

/**
 * What each create carries: named strings only, each bounded, the required
 * ones present. Anything else is refused, so nothing about money (an amount,
 * an account, a card) has a field to travel in.
 */
const PAYLOAD_FIELDS: Record<CreateKind, { required: readonly string[]; optional: readonly string[] }> = {
  send_message: { required: ["conversationId", "body"], optional: [] },
  request_inspection: { required: ["listingId", "when"], optional: ["note"] },
  submit_review: { required: ["bookingId", "rating"], optional: ["body"] },
  drop_post: { required: ["kind", "body"], optional: ["areaId"] },
};
const MAX_FIELD = 5_000;

export type OutboxPayload = Record<string, string>;

export function checkPayload(kind: CreateKind, value: unknown): OutboxPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = PAYLOAD_FIELDS[kind];
  const allowed = new Set([...fields.required, ...fields.optional]);
  const out: OutboxPayload = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key) || typeof item !== "string" || item.length > MAX_FIELD) return null;
    out[key] = item;
  }
  for (const key of fields.required) if (!out[key] || out[key]!.trim().length === 0) return null;
  return out;
}

export type OutboxEntry = {
  key: string;
  kind: OutboxKind;
  /** A listing id, "accommodation:<id>" / "restaurant:<id>", or a create's own UUID. */
  target: string;
  want: boolean;
  /** A create's fields; absent on a save. */
  payload?: OutboxPayload;
  /**
   * Who tapped it: the signed-in user's id, or null for a guest. Stamped by
   * `enqueue`; the tray replays only the current session's entries and drops
   * the rest, so nothing one person did is ever sent as another.
   */
  userId?: string | null;
  createdAt: number;
  attempts: number;
  nextAt: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function entryKey(kind: OutboxKind, target: string): string {
  return `${kind}:${target}`;
}

/** A new intent, or null for anything this outbox does not carry. */
export function makeEntry(kind: string, target: string, want: boolean, now: number): OutboxEntry | null {
  if (!(SAVE_KINDS as readonly string[]).includes(kind)) return null;
  if (kind === "save_place") {
    const [placeKind, id] = target.split(":");
    if ((placeKind !== "accommodation" && placeKind !== "restaurant") || !id || !UUID.test(id)) return null;
  } else if (target.length === 0 || target.length > 120) {
    return null;
  }
  return { key: entryKey(kind as OutboxKind, target), kind: kind as OutboxKind, target, want, createdAt: now, attempts: 0, nextAt: now };
}

/** A create tapped offline, under a UUID minted now; null for anything this outbox does not carry. */
export function makeCreateEntry(kind: string, id: string, payload: unknown, now: number): OutboxEntry | null {
  if (!(CREATE_KINDS as readonly string[]).includes(kind) || !UUID.test(id)) return null;
  const checked = checkPayload(kind as CreateKind, payload);
  if (!checked) return null;
  return { key: entryKey(kind as OutboxKind, id), kind: kind as OutboxKind, target: id, want: true, payload: checked, createdAt: now, attempts: 0, nextAt: now };
}

export function isCreate(entry: OutboxEntry): entry is OutboxEntry & { kind: CreateKind; payload: OutboxPayload } {
  return (CREATE_KINDS as readonly string[]).includes(entry.kind) && !!entry.payload;
}

/** Wait before the next try: 5s, 15s, 45s, then every two minutes. */
export function backoff(attempts: number): number {
  return [5_000, 15_000, 45_000][attempts] ?? 120_000;
}

/** The entries due now, oldest first: the order they were tapped. */
export function due(entries: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return entries.filter((e) => e.nextAt <= now).sort((a, b) => a.createdAt - b.createdAt);
}

/** A record read back from storage, checked before it is believed. */
export function asEntry(value: unknown): OutboxEntry | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== "string" || typeof v.target !== "string" || typeof v.want !== "boolean") return null;
  const made = (CREATE_KINDS as readonly string[]).includes(v.kind)
    ? makeCreateEntry(v.kind, v.target, v.payload, 0)
    : makeEntry(v.kind, v.target, v.want, 0);
  if (!made) return null;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
  const userId = typeof v.userId === "string" && v.userId.length <= 64 ? v.userId : null;
  return { ...made, userId, createdAt: num(v.createdAt), attempts: num(v.attempts), nextAt: num(v.nextAt) };
}

/* --------------------------------------------------------------- storage */

const DB_NAME = "vallo-outbox";
const STORE = "entries";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, mode);
      const request = act(tx.objectStore(STORE));
      tx.oncomplete = () => {
        db.close();
        resolve(request ? (request.result as T) : null);
      };
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
      tx.onabort = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

const listeners = new Set<() => void>();
export function onOutboxChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function changed(): void {
  for (const listener of listeners) listener();
}

/** The signed-in user on this phone, or null. */
export async function currentUserId(): Promise<string | null> {
  try {
    const { createClient } = await import("../supabase/client");
    const { data } = await createClient().auth.getSession();
    return data.session?.user.id ?? null;
  } catch {
    return null;
  }
}

/** Keep an intent, stamped with who tapped it. The latest tap on the same thing replaces the earlier one. */
export async function enqueue(entry: OutboxEntry): Promise<boolean> {
  const stamped = { ...entry, userId: await currentUserId() };
  const done = await run("readwrite", (s) => s.put(stamped, entry.key));
  changed();
  return done !== null;
}

export async function readOutbox(): Promise<OutboxEntry[]> {
  const values = (await run<unknown[]>("readonly", (s) => s.getAll())) ?? [];
  return values.map(asEntry).filter((e): e is OutboxEntry => e !== null);
}

export async function forget(key: string): Promise<void> {
  await run("readwrite", (s) => s.delete(key));
  changed();
}

export async function reschedule(entry: OutboxEntry, now: number): Promise<void> {
  await run("readwrite", (s) => s.put({ ...entry, attempts: entry.attempts + 1, nextAt: now + backoff(entry.attempts) }, entry.key));
}

/**
 * Told when a queued create reaches the server, so the screen that showed it
 * as waiting can swap in the real thing (a message bubble takes its real id).
 */
export const OUTBOX_SENT_EVENT = "vallo:outbox-sent";
export type OutboxSentDetail = { key: string; kind: OutboxKind; data: unknown };

export function announceSent(detail: OutboxSentDetail): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<OutboxSentDetail>(OUTBOX_SENT_EVENT, { detail }));
}

export async function clearOutbox(): Promise<void> {
  await run("readwrite", (s) => s.clear());
  changed();
}
