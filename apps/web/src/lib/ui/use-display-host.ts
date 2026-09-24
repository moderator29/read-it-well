"use client";

import { useSyncExternalStore } from "react";
import { BRAND_DOMAIN, displayHost } from "@/lib/brand-domain";

const noSubscription = () => () => undefined;

/**
 * UI-14: the host to print in copy, safe to render.
 *
 * `displayHost()` answers the brand domain on the server and the page's own
 * host in the browser ("www.…"), so calling it during render gave the server
 * and the first client render different text, and React threw away the tree
 * (error #418) on every load of the profile editor. This renders the server's
 * answer during hydration and the browser's straight after.
 */
export function useDisplayHost(): string {
  return useSyncExternalStore(noSubscription, displayHost, () => BRAND_DOMAIN);
}
