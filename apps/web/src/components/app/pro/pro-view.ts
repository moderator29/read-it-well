/**
 * WHETHER AN ENTITLED MEMBER HAS PRO VIEW ON, ON THIS DEVICE.
 *
 * This is a viewing preference and nothing else: the switch only exists for a
 * member the server says holds a plan (`pro-entitlement.ts`), and the Pro
 * state changes depth, never access to the truth (north star 14.2). So the
 * preference may live on the device, in a cookie the server reads before it
 * paints, and losing it costs nothing but one tap. It is never read as
 * evidence of a plan: a cookie saying "on" for a member with no entitlement
 * draws nothing, because the switch and the Pro surface both ask the server
 * first.
 *
 * Client-safe: constants and pure functions only.
 */
export const PRO_VIEW_COOKIE = "vallo_pro_view";
export const PRO_VIEW_MAX_AGE = 60 * 60 * 24 * 400;

export function isProViewOn(value: string | null | undefined): boolean {
  return value === "on";
}

export function proViewCookieString(on: boolean, secure: boolean): string {
  return [
    `${PRO_VIEW_COOKIE}=${on ? "on" : "off"}`,
    "Path=/",
    `Max-Age=${PRO_VIEW_MAX_AGE}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}
