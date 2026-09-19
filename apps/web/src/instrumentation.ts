/**
 * The server side of crash reporting, and the only place it is registered.
 *
 * Next calls `onRequestError` for EVERY uncaught server error: a route
 * handler that threw, a server action that threw, a React Server Component
 * that threw before its error boundary caught it, and a streamed render that
 * failed part way. One function therefore covers the whole server surface
 * without a try/catch being added anywhere, and without an SDK reaching into
 * the request pipeline.
 *
 * WHAT IS PASSED ON, AND WHAT IS NOT. Next hands this hook the live request:
 * its path, its method and its headers. Only the ROUTE PATTERN and the
 * method are forwarded. The live path names people (`/u/<handle>`) and
 * carries invite and reset tokens in its query string; the headers carry the
 * session cookie and the authorization header. Neither is read here, and
 * `lib/observability/scrub.ts` would drop them anyway, which is the point of
 * an allowlist: the rule holds even when a future edit to this file
 * forgets it.
 *
 * `register` is empty and stays empty. There is nothing to boot: the
 * reporter reads `SENTRY_DSN` at the moment it is used, so a deployment can
 * set it without the process being rebuilt around it, and with no DSN the
 * whole thing costs one string compare per error.
 */

import type { Instrumentation } from "next";

export function register(): void {
  // Deliberately nothing. See the note above.
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  _request,
  context,
) => {
  // The edge runtime gets the same treatment; `fetch` and `AbortSignal` are
  // both present there. The import is dynamic so that nothing pulls the
  // reporter, or `server-only`, into a build that never hits this path.
  const { reportError } = await import("@/lib/observability/report");

  await reportError({
    error,
    level: "error",
    context: {
      kind: "server.request",
      // The PATTERN, from Next's own context, never `request.path`.
      routePath: context.routePath,
      routerKind: context.routerKind,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
      runtime: process.env.NEXT_RUNTIME ?? "server",
    },
  });
};
