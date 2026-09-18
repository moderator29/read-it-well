import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_SIDE, isSide, SIDE_COOKIE, type Side } from "./side.constants";

export { SIDE_COOKIE };
export type { Side };

/**
 * Resolve the active side (Property or Stays) for the current request.
 *
 * A cookie only, and it stays a cookie: there is no user-level side column
 * anywhere in the database and none is to be added. One profiles row, one
 * wallet, one notifications feed serve both sides. The side is a view
 * preference, never an authorisation, exactly the doctrine `getMode()` carries.
 *
 * The layout reads this once and hands it to the shell; a side-owned URL
 * overrides it through `sideOfPath`, so a deep link into a hotel opens in
 * the Stays shell no matter what the cookie says.
 */
export async function getSide(): Promise<Side> {
  const store = await cookies();
  const value = store.get(SIDE_COOKIE)?.value;
  return isSide(value) ? value : DEFAULT_SIDE;
}
