/**
 * The origins a call screen's browser must reach, as CSP `connect-src` sources.
 *
 * Read from the server's `LIVEKIT_URL` when the policy is built, so a project
 * move follows the environment and an unset URL adds nothing at all (a
 * keyless build's policy stays as tight as it was before calls existed).
 *
 * LiveKit Cloud is the one place a wildcard is unavoidable: the client SDK
 * first asks `https://<project>.livekit.cloud` for its regions and then
 * connects to a regional host under the same domain
 * (https://docs.livekit.io/home/cloud/region-pinning/). So a Cloud URL
 * allows `*.livekit.cloud` over https and wss, and nothing wider. A
 * self-hosted server gets its own exact origin, both schemes.
 *
 * Media itself (WebRTC over UDP, or TURN) is not governed by `connect-src`.
 */
export function callMediaOrigins(raw: string | undefined | null): string[] {
  const value = (raw ?? "").trim();
  if (!value) return [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return [];
  }
  const secure = url.protocol === "wss:" || url.protocol === "https:";
  const plain = url.protocol === "ws:" || url.protocol === "http:";
  if (!secure && !plain) return [];
  const host = url.host;
  if (secure && /(^|\.)livekit\.cloud$/i.test(url.hostname)) {
    return ["https://*.livekit.cloud", "wss://*.livekit.cloud"];
  }
  return secure ? [`https://${host}`, `wss://${host}`] : [`http://${host}`, `ws://${host}`];
}
