/**
 * WHERE THE INSPECTION PACKS LIVE ON THE PHONE: INDEXEDDB. V-35.
 *
 * One database, `vallo-packs`, separate from every cache the service worker
 * keeps, holding two stores: `packs` (keyed by inspection id) and `checkins`
 * (what happened at the gate, waiting for signal). It holds no wallet figure
 * and no message, by construction: nothing else writes here.
 *
 * WHY NOT localStorage. It is synchronous, it is string-only, and a pack is
 * read by the offline page at the moment the phone is weakest. IndexedDB is
 * asynchronous and structured, and the service worker could read it too if a
 * later version wants to.
 *
 * EVERY FUNCTION HERE FAILS QUIETLY. Private browsing, a full disk and a
 * browser that refuses storage all end in "no pack", which the gate states in
 * words ("This phone has no pack for this inspection yet") rather than as an
 * error. Every read is validated by `pack.ts` before it is believed, because
 * storage on a device is not ours.
 *
 * ONE OWNER AT A TIME. Every pack carries the account it was issued to, and a
 * `meta` record names the account that last saved one here. Only that
 * account's packs are ever read back, and a pack saved by a different
 * account clears the previous one's first. `clearPacks` also runs from both
 * sign-out controls in settings and on account deletion, and a signed-out
 * way in (`components/app/offline/ForgetOnSignOut.tsx`, which checks there
 * is no session first) clears the packs but keeps the unsent check-ins for
 * their owner, so a session that ended some other way (expiry, the devices
 * screen from another phone) leaves no gate code behind.
 */

import { asCheckin, asPack, checkinKey, isExpired, livePacks, type InspectionPack, type QueuedCheckin } from "./pack";

const DB_NAME = "vallo-packs";
const DB_VERSION = 2;
const PACKS = "packs";
const CHECKINS = "checkins";
/* One record, "owner": the account that last saved a pack on this phone. */
const META = "meta";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PACKS)) db.createObjectStore(PACKS);
        if (!db.objectStoreNames.contains(CHECKINS)) db.createObjectStore(CHECKINS);
        if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  work: (s: IDBObjectStore) => IDBRequest<T> | null,
): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const tx = db.transaction(store, mode);
          const request = work(tx.objectStore(store));
          let value: T | null = null;
          if (request) request.onsuccess = () => (value = request.result);
          tx.oncomplete = () => {
            db.close();
            resolve(value);
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
      }),
  );
}

async function readOwner(): Promise<string | null> {
  const value = await run<unknown>(META, "readonly", (s) => s.get("owner"));
  return typeof value === "string" ? value : null;
}

/**
 * Save a pack. If it was issued to a different account from the one that
 * last saved here, that account's packs and queued check-ins go first: one
 * phone, one owner of gate codes at a time.
 */
export async function savePack(pack: InspectionPack): Promise<boolean> {
  const owner = await readOwner();
  if (owner !== pack.userId) {
    await clearPacks();
    await run(META, "readwrite", (s) => s.put(pack.userId, "owner"));
  }
  const done = await run(PACKS, "readwrite", (s) => s.put(pack, pack.inspectionId));
  return done !== null;
}

export async function readPack(inspectionId: string, now: number): Promise<InspectionPack | null> {
  const value = await run<unknown>(PACKS, "readonly", (s) => s.get(inspectionId));
  const pack = asPack(value);
  if (!pack || pack.userId !== (await readOwner())) return null;
  if (isExpired(pack, now)) {
    await deletePack(inspectionId);
    return null;
  }
  return pack;
}

/** Every live pack, soonest first. Expired ones are deleted on the way. */
export async function readPacks(now: number): Promise<InspectionPack[]> {
  const values = (await run<unknown[]>(PACKS, "readonly", (s) => s.getAll())) ?? [];
  const live = livePacks(values, now, await readOwner());
  if (live.length !== values.length) {
    const keep = new Set(live.map((p) => p.inspectionId));
    for (const value of values) {
      const id = (value as { inspectionId?: unknown } | null)?.inspectionId;
      if (typeof id === "string" && !keep.has(id)) await deletePack(id);
    }
  }
  return live;
}

export async function deletePack(inspectionId: string): Promise<void> {
  await run(PACKS, "readwrite", (s) => s.delete(inspectionId));
}

export async function queueCheckin(checkin: QueuedCheckin): Promise<void> {
  await run(CHECKINS, "readwrite", (s) => s.put(checkin, checkinKey(checkin)));
}

export async function readCheckins(): Promise<QueuedCheckin[]> {
  const values = (await run<unknown[]>(CHECKINS, "readonly", (s) => s.getAll())) ?? [];
  return values.map(asCheckin).filter((c): c is QueuedCheckin => c !== null);
}

export async function forgetCheckin(checkin: QueuedCheckin): Promise<void> {
  await run(CHECKINS, "readwrite", (s) => s.delete(checkinKey(checkin)));
}

/**
 * The gate codes only, for a signed-out way in. The unsent check-ins and the
 * owner record stay, so the same person signing back in still sends them and
 * anybody else saving a pack clears them first (`savePack`).
 */
export async function forgetPacksKeepQueue(): Promise<void> {
  await run(PACKS, "readwrite", (s) => s.clear());
}

/** Everything, for signing out and for a phone that changes hands. */
export async function clearPacks(): Promise<void> {
  await run(PACKS, "readwrite", (s) => s.clear());
  await run(CHECKINS, "readwrite", (s) => s.clear());
  await run(META, "readwrite", (s) => s.clear());
}
