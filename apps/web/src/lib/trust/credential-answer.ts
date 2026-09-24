import type { Dictionary } from "@vallo/i18n";

/**
 * V-87: `public.record_credential`'s answer, in the desk's words. Pure. Null
 * means recorded; anything the database did not say plainly reads as a
 * number the desk should check again, never as success.
 */
export function credentialRefusal(data: unknown, desk: Dictionary["trustVisible"]["desk"]): string | null {
  switch (data) {
    case "recorded":
      return null;
    case "forbidden":
      return desk.credentialForbidden;
    case "no_name":
      return desk.credentialNoName;
    case "needs_aggregator":
      return desk.credentialNeedsAggregator;
    default:
      return desk.credentialInvalid;
  }
}
