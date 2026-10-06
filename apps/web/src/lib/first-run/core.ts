/**
 * W7-R1 / W7-R2: the server-side first-run store, the part with no I/O.
 *
 * The shape matches `FirstRunStore` in Session 3's
 * first-run store module on the experience branch exactly: `read`
 * answers "seen", "unseen" or "unknown", and `mark` never throws. Every
 * failure answers "unknown", which hands the decision back to the device's
 * cookie, so a broken store can never make a first run show twice.
 */

export type FirstRunAnswer = "seen" | "unseen" | "unknown";

/** The database check, mirrored: lower-case, starts with a letter, at most 40. */
export function isFirstRunFeature(value: unknown): value is string {
  return typeof value === "string" && /^[a-z][a-z0-9_-]{0,39}$/.test(value);
}

export type FirstRunDb = {
  /** The member's id, or null when signed out. */
  userId(): Promise<string | null>;
  /** Whether a row exists; throws on any failure. */
  hasRow(userId: string, feature: string): Promise<boolean>;
  /** Write the row; idempotent; throws on any failure. */
  mark(feature: string): Promise<void>;
};

export async function readFirstRun(db: FirstRunDb, feature: string): Promise<FirstRunAnswer> {
  if (!isFirstRunFeature(feature)) return "unknown";
  try {
    const userId = await db.userId();
    if (!userId) return "unknown";
    return (await db.hasRow(userId, feature)) ? "seen" : "unseen";
  } catch {
    return "unknown";
  }
}

export async function markFirstRun(db: FirstRunDb, feature: string): Promise<void> {
  if (!isFirstRunFeature(feature)) return;
  try {
    if (!(await db.userId())) return;
    await db.mark(feature);
  } catch {
    /* A failed write is retried by the next show (the interface's contract). */
  }
}
