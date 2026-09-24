/**
 * The data saver cookie's name and its reading, shared by the server
 * (`lib/save-data.ts`) and the client (`lib/ui/lite.ts`). V-79. Pure, so both
 * sides can import it and a test can pin it.
 */
export const LITE_COOKIE = "vallo_lite";

export function liteCookieOn(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((part) => part.trim() === `${LITE_COOKIE}=1`);
}
