/**
 * DOES THIS STORAGE PATH SIT IN THE OWNER'S FOLDER? (Agent D audit, 17 October 2026)
 *
 * A prefix test alone (`path.startsWith(`${owner}/`)`) passes
 * `<owner>/../<someone else>/x`, which a storage key resolver or a public URL
 * builder may normalise into the other person's folder. The rule, the same
 * one the host desk's `documentPathBelongsTo` holds on the lead branch:
 * bounded length, the owner's folder first, no backslash and no control
 * character (a URL parser strips tab and newline and would join segments),
 * and every segment present and never `.` or `..`.
 *
 * Pure, so it is tested rather than trusted. Comparison is case-insensitive
 * because ids are UUIDs written in either case.
 */
export function storagePathBelongsTo(owner: string, path: string): boolean {
  if (typeof owner !== "string" || typeof path !== "string") return false;
  if (owner.length === 0 || path.length === 0 || path.length > 400) return false;
  if (path.includes("\\") || /[\u0000-\u001F\u007F]/.test(path)) return false;
  const segments = path.split("/");
  if (segments.length < 2) return false;
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) return false;
  return segments[0]!.toLowerCase() === owner.toLowerCase();
}
