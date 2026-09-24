/**
 * WHERE THE SHORTLIST LIVES ON THE PHONE: IndexedDB `vallo-shelf`. V-77.
 *
 * Its own database, beside `vallo-packs` (`pack-store.ts`) and apart from
 * every service-worker cache, holding one store keyed by listing id. It holds
 * listing figures and nothing about the person beyond the fact of the save.
 * Every function fails quietly into "nothing on the phone", and every read is
 * validated by `shelf.ts` before it is believed. `clearShelf` runs on
 * sign-out, on a signed-out way in, and when an account is deleted.
 *
 * ONE OWNER. A `meta` record names the account the shelf was synced for. A
 * sync for any other account clears the shelf first, so neither the list
 * nor the first-kept figures carry over from one person to the next.
 */

import { asShelfItem, mergeShelf, type ShelfChange, type ShelfItem } from "./shelf";

const DB_NAME = "vallo-shelf";
const STORE = "items";
const META = "meta";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
        if (!request.result.objectStoreNames.contains(META)) request.result.createObjectStore(META);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function readShelf(): Promise<ShelfItem[]> {
  const db = await open();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      request.onsuccess = () => {
        db.close();
        const items = (request.result as unknown[])
          .map(asShelfItem)
          .filter((item): item is ShelfItem => item !== null)
          .sort((a, b) => Date.parse(b.storedAt) - Date.parse(a.storedAt));
        resolve(items);
      };
      request.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

async function readOwner(): Promise<string | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const request = db.transaction(META, "readonly").objectStore(META).get("owner");
      request.onsuccess = () => {
        db.close();
        resolve(typeof request.result === "string" ? request.result : null);
      };
      request.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/** Replace the shelf with this account's list, returning what moved. */
export async function syncShelf(owner: string, incoming: readonly ShelfItem[]): Promise<ShelfChange[]> {
  /* Another account's shelf is not a history for this one. */
  const previous = (await readOwner()) === owner ? await readShelf() : [];
  const { items, changes } = mergeShelf(previous, incoming);
  const db = await open();
  if (!db) return changes;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction([STORE, META], "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      for (const item of items) store.put(item, item.id);
      tx.objectStore(META).put(owner, "owner");
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
  return changes;
}

export async function clearShelf(): Promise<void> {
  const db = await open();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction([STORE, META], "readwrite");
      tx.objectStore(STORE).clear();
      tx.objectStore(META).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
