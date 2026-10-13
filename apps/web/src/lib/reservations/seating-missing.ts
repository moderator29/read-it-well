/**
 * True when a read or a call failed only because migration 20261013100000
 * (seatings, bills, reviews) is not applied yet: a missing function, table
 * or column. Every seating screen then degrades to how it worked before.
 */
export function seatingMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  if (code === "PGRST202" || code === "PGRST205" || code === "PGRST204" || code === "42P01" || code === "42883" || code === "42703") {
    return true;
  }
  return /could not find the (function|table)|does not exist/i.test(error.message ?? "");
}
