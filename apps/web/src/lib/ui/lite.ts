"use client";

import { setDataSaverSetting } from "@/components/app/account/settings-store";
import { LITE_COOKIE, liteCookieOn } from "./lite-cookie";

/**
 * THE DATA SAVER THE SERVER CAN SEE. V-79.
 *
 * The switch used to be stored twice and read by nobody who rendered HTML:
 * the device setting (`nf_settings.dataSaver`, read by `lib/ui/data-saver.ts`
 * on the client, after the markup had already asked for its images) and the
 * account setting (`profiles.settings.dataSaver`, read by nothing). The
 * server's only input was the `Save-Data` header, which Chrome stopped sending
 * by default when it retired Lite mode in 2022.
 *
 * So turning it on now writes one first-party cookie, `vallo_lite=1`, beside
 * the device setting, the same way the theme once did: a cookie is the one
 * thing the server can read before it renders a byte. `lib/save-data.ts`
 * reads it with the header, the root layout marks `<html data-save-data="on">`,
 * and `app/css/data-saver.css` drops the scenic art from the paint.
 * `isDataSaver()` reads it too, so the prefetch and the gallery agree.
 *
 * 400 days, the ceiling browsers enforce; `SameSite=Lax`; readable by script
 * because it is a preference, not a credential.
 */
export function readLite(): boolean {
  if (typeof document === "undefined") return false;
  return liteCookieOn(document.cookie);
}

export function setLite(on: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = on
    ? `${LITE_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`
    : `${LITE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  setDataSaverSetting(on);
  /* The saving applies on this page too, not only from the next render. */
  document.documentElement.dataset.saveData = on ? "on" : "off";
}
