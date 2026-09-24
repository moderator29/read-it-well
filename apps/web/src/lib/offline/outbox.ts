/**
 * THE OUTBOX: WHAT YOU DID OFFLINE IS KEPT. V-40.
 *
 * A non-money action tapped with no signal (today: saving or unsaving a
 * listing or a place) is written here the moment it is tapped, shown at once
 * with "Waiting for signal", and replayed in order when the connection comes
 * back (`OutboxRunner`). IndexedDB `vallo-outbox`, apart from every other
 * store on the phone.
 *
 * NEVER MONEY. There is no money kind in `OutboxKind` and `enqueue` refuses
 * anything else: a payment is never queued, it is either made with a
 * connection or not started (`lib/offline/inflight.ts` is the other half: a
 * payment that started and lost its connection is resolved, never replayed).
 *
 * REPLAY NEVER DUPLICATES. Each entry is keyed by what it is about
 * (`save:<listing>`), so a second tap on the same heart replaces the first
 * intent rather than queueing a toggle twice, and each entry carries the
 * STATE wanted (saved or not), which the server sets idempotently. A replay
 * after a half-delivered request lands in the same place.
 */

export const OUTBOX_KINDS = ["save_listing", "save_place"] as const;
export type OutboxKind = (typeof OUTBOX_KINDS)[number];

export type OutboxEntry = {
  key: string;
  kind: OutboxKind;
  /** A listing id, or "accommodation:<id>" / "restaurant:<id>". */
  target: string;
  want: boolean;
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
  if (!(OUTBOX_KINDS as readonly string[]).includes(kind)) return null;
  if (kind === "save_place") {
    const [placeKind, id] = target.split(":");
    if ((placeKind !== "accommodation" && placeKind !== "restaurant") || !id || !UUID.test(id)) return null;
  } else if (target.length === 0 || target.length > 120) {
    return null;
  }
  return { key: entryKey(kind as OutboxKind, target), kind: kind as OutboxKind, target, want, createdAt: now, attempts: 0, nextAt: now };
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
  const made = makeEntry(v.kind, v.target, v.want, 0);
  if (!made) return null;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);
  return { ...made, createdAt: num(v.createdAt), attempts: num(v.attempts), nextAt: num(v.nextAt) };
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

/** Keep an intent. The latest tap on the same thing replaces the earlier one. */
export async function enqueue(entry: OutboxEntry): Promise<boolean> {
  const done = await run("readwrite", (s) => s.put(entry, entry.key));
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

export async function clearOutbox(): Promise<void> {
  await run("readwrite", (s) => s.clear());
  changed();
}
