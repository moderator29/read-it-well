/**
 * WHICH WEB PUSH ENDPOINTS THE SERVER WILL EVER POST TO.
 *
 * A Web Push subscription's endpoint is a URL the browser hands us, and the
 * server POSTs to it. Unchecked, that makes any signed-in member able to point
 * the server at an address of their choosing (loopback, a private range, the
 * cloud metadata address) and read the status code back from the self-test.
 *
 * Every real browser subscribes through one of a handful of push services, so
 * the endpoint must be https on one of their hosts. Anything else is refused
 * when the device registers and again right before a send, so a row written
 * before this check existed can never be used either.
 *
 * Client-safe: no imports, no secrets.
 */

/** Exact hosts, and suffixes that must follow a dot. */
const EXACT_HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
const HOST_SUFFIXES = [".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com"];

export function isAllowedWebPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  /* No credentials and no explicit port: push services use neither, and both
     are ways to aim a request somewhere other than the host it names. */
  if (url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (EXACT_HOSTS.has(host)) return true;
  return HOST_SUFFIXES.some((suffix) => host.endsWith(suffix) && host.length > suffix.length);
}
