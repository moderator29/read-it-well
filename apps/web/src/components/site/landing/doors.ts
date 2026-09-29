import { publicCatalogueEnabled } from "@/lib/catalogue/public-access";
import { gatedHref } from "@/lib/site/gated-href";
import { isPublicPath } from "@/proxy";

/**
 * WHERE A LANDING DOOR REALLY GOES (UIUX item 12, "honest doors").
 *
 * A stranger who pressed "Explore properties" was sent to `/search`, which the
 * proxy answers with a 307 to sign in while the founder's catalogue switch
 * (`VALLO_PUBLIC_CATALOGUE`) is off: the landing's main door was a surprise
 * sign-in. So every product door on the landing asks the proxy's own rule
 * (`isPublicPath`, the same function the running middleware uses) whether a
 * stranger can open it. When they can, the door is the destination. When they
 * cannot, the door is the sign-up door carrying the destination
 * (`gatedHref`), and the button says what it does ("Get started").
 *
 * This is not a guard. The lock stays in `proxy.ts`; this only stops the front
 * door promising a room it will not open. The landing is only ever rendered
 * for a visitor who is signed out or has not been sent home, so the stranger's
 * answer is the right one to print.
 */
export type Door = (destination: string) => string;

export function landingDoor(open: boolean = publicCatalogueEnabled()): Door {
  return (destination) => {
    const path = destination.split(/[?#]/, 1)[0] || "/";
    return isPublicPath(path, { publicCatalogue: open }) ? destination : gatedHref(destination);
  };
}

/** True when a stranger can open the catalogue itself (`/search`). */
export function catalogueIsOpen(door: Door): boolean {
  return door("/search") === "/search";
}
