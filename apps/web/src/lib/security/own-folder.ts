/**
 * Whether a storage path sits inside the caller's own folder (`<userId>/...`).
 *
 * A prefix test alone is not a folder test: `<uid>/../<someone else>/x` starts
 * with `<uid>/` and walks out of it. Storage policies confine the WRITE to the
 * caller's folder; this is the second check that keeps a forged path from being
 * RECORDED on a row as theirs (an avatar, a host document, a listing photo).
 * Refused: an empty or over-long path, a backslash, a control character, and
 * any empty, `.` or `..` segment.
 */
export function pathInOwnFolder(userId: string, storagePath: string): boolean {
  if (userId.length === 0 || storagePath.length === 0 || storagePath.length > 400) return false;
  if (!storagePath.startsWith(`${userId}/`)) return false;
  if (/[\\\u0000-\u001f\u007f]/.test(storagePath)) return false;
  return storagePath.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}
