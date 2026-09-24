/**
 * The visitor's own User-Agent, to forward to GoTrue, capped; or nothing.
 *
 * GoTrue stamps `auth.sessions.user_agent` from the User-Agent header of the
 * request that created (and later refreshed) the session. Sign-in, sign-up
 * confirmation and the code exchange all run in a server action or a route
 * handler, so without this the header GoTrue saw was the server's own fetch
 * agent (`node`), and every row on `/settings/devices` read "Device not
 * recorded": a list that cannot help anybody spot a stranger. The new-device
 * email keys on the same column, so it could only ever fire once per account.
 *
 * The value is attacker controlled, as every request header is. It is never
 * rendered: `lib/security/device.ts` and `private.device_words` map it onto a
 * fixed list of names. Capped because it lands in a column.
 */
export const FORWARDED_AGENT_MAX = 512;

export function forwardedAgentHeaders(agent: string | null | undefined): Record<string, string> {
  const value = (agent ?? "").trim();
  return value ? { "user-agent": value.slice(0, FORWARDED_AGENT_MAX) } : {};
}
