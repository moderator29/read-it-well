import type { BackDecision } from "./resolve";

/**
 * THE BACK OF A PAUSED SOCIAL SCREEN, AS A RULE.
 *
 * When social is switched off, every social route renders `SocialPaused`, and
 * every social route declares another social route as its parent
 * (`route-parents.ts`), so the ordinary back would land on a second paused
 * screen. But the ordinary rule is also right in one case that matters: a post
 * opened from a Messages thread should go Back to the thread (the screen the
 * member came from), not to the home of the side.
 *
 * So the decision is still taken by `decideBack`; this only refuses a
 * destination that is itself social and sends that one case to the home of the
 * side instead. Anything else (the thread, the inbox, a listing) is carried
 * out as decided. The drawn control (`PausedBack`) and Android's hardware
 * button (`NativeRuntime`, through `data-social-paused` on <html>) both apply
 * it, so the two agree.
 */
const SOCIAL_PATH = /^\/(around|post|stories|u)(\/|$)/;

/** True when `href` is one of the paused social areas. Query and hash ignored. */
export function isSocialPath(href: string): boolean {
  const path = href.split(/[?#]/)[0] ?? href;
  return SOCIAL_PATH.test(path);
}

/** Keep the decision, unless it lands on a social path: then replace to `home`. */
export function settlePausedBack(decision: BackDecision, home: string): BackDecision {
  if (decision.action === "exit") return decision;
  if (isSocialPath(decision.href)) return { action: "replace", href: home, reason: "root-fallback" };
  return decision;
}
