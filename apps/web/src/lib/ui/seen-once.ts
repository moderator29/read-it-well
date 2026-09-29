/**
 * "Has THIS DEVICE already been shown this moment?"
 *
 * For the approvals that happen somewhere else (Vallo approves an agreement,
 * a reviewer approves documents) and are written into a notification by the
 * database, where no flag can ride on the link. The page reads the truth from
 * the server, and this says only whether the celebration has already been
 * shown here, so it is shown once and never replayed.
 *
 * Browser storage can be missing, full, blocked or throw in a private window,
 * so every read and write is guarded. When it cannot be read the answer is
 * "seen": a celebration that fails to appear costs nothing, one that replays
 * on every visit is noise.
 */
const PREFIX = "nf-seen:";

export function seenOnce(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(PREFIX + key) === "1";
  } catch {
    return true;
  }
}

export function markSeen(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, "1");
  } catch {
    /* Storage refused: at worst the moment shows once more. */
  }
}
