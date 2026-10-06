/**
 * The cookie that says "this code has been revealed on this device", so the
 * gift plays once and a returning member opens on the settled ticket. Its value
 * is the code itself: a different account on the same phone has its own first
 * reveal. A plain interface preference, readable by the server so the page
 * renders the right state with no flash.
 */
export const INVITE_SEEN_COOKIE = "vallo_invite_seen";
