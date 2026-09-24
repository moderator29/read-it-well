/**
 * WHERE THE SHORTLIST LIVES ON THE PHONE: IndexedDB `vallo-shelf`. V-77.
 *
 * Its own database, beside `vallo-packs` (`pack-store.ts`) and apart from
 * every service-worker cache, holding one store keyed by listing id. It holds
 * listing figures and nothing about the person beyond the fact of the save.
 * Every function fails quietly into "nothing on the phone", and every read is
 * validated by `shelf.ts` before it is believed. `clearShelf` runs with
 * `clearPacks` on sign-out.
 */

import { asShelfItem, mergeShelf, type ShelfChange, type ShelfItem } from "./shelf";

const DB_NAME = "vallo-shelf";
const STORE = "items";

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

/** Replace the shelf with the account's list, returning what moved. */
export async function syncShelf(incoming: readonly ShelfItem[]): Promise<ShelfChange[]> {
  const previous = await readShelf();
  const { items, changes } = mergeShelf(previous, incoming);
  const db = await open();
  if (!db) return changes;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.clear();
      for (const item of items) store.put(item, item.id);
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
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
