/**
 * The FOCUSED routes: a financial screen that carries its own bar (back, its
 * title, its gear) and its own bottom actions, so the app's header and the
 * dock both step aside (D81; the founder's Wallet brief, section 6: "do not
 * add the application's unrelated global bottom navigation to a wallet
 * screen that is intended to operate as a focused financial interface").
 * Unlike an immersive route the page still scrolls as a page and the side
 * rail stays on a laptop. Today that is /wallet and every screen under it.
 *
 * Pure, so the shell, the dock and a node test read the same answer.
 */
export function isFocusedRoute(pathname: string): boolean {
  return pathname === "/wallet" || pathname.startsWith("/wallet/");
}
