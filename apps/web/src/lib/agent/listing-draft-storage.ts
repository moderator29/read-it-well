/**
 * SUP-16: THE LISTING WIZARD'S DEVICE COPY BELONGS TO ONE ACCOUNT.
 *
 * The draft can hold an address, a gate code and a security phone. It was one
 * key for every account on the device and it outlived sign-out, so the next
 * person to sign in on a shared phone was offered the last lister's draft.
 * It is now keyed by the account, and every copy is removed when anybody
 * signs out on this device. Without an account there is no device copy.
 */
const PREFIX = "nf_listing_draft";

/** The key for this account's draft, or null when nobody is signed in. */
export function listingDraftKey(userId: string | null | undefined): string | null {
  return userId ? `${PREFIX}:${userId}` : null;
}

/** Remove every listing draft on this device: each account's and the old shared one. */
export function clearListingDrafts(storage: Pick<Storage, "length" | "key" | "removeItem"> | null = safeStorage()): void {
  if (!storage) return;
  try {
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && (key === PREFIX || key.startsWith(`${PREFIX}:`))) doomed.push(key);
    }
    for (const key of doomed) storage.removeItem(key);
  } catch {
    /* storage unavailable: nothing was held there */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
