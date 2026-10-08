import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { resolveSessionClaims } from "@/lib/actions/session";
import { videoCallsOn } from "@/lib/calls/flags";
import { CallLayer } from "./CallLayer";

/**
 * The shell's mount for the call layer: signed in, and `video_calls` on, or
 * nothing at all. A server component, so a page whose switch is off ships
 * no call code beyond this check (and the check is one cached flag read and
 * the session the shell has already resolved).
 */
export async function CallLayerMount() {
  const [on, session] = await Promise.all([videoCallsOn(), resolveSessionClaims()]);
  if (!on || session.state !== "signed-in") return null;
  const t = getDictionary(await getLocale());
  return <CallLayer userId={session.userId} copy={t.calls} />;
}
