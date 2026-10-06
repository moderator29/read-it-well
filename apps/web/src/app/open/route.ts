import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { resolveSession } from "@/lib/actions/session";
import { signedOutStart } from "@/lib/catalogue/public-access";

/**
 * WHERE THE NATIVE APP OPENS (STORE-04).
 *
 * `server.appStartPath` in `capacitor.config.ts` points the shell here rather
 * than at `/`, the marketing page a reviewer would read as "a website in a
 * frame". A session goes to `/home`. Anybody else goes to the open catalogue
 * when the founder has switched it on (`VALLO_PUBLIC_CATALOGUE`), and to the
 * first-run welcome otherwise, which is where sign-up and sign-in begin.
 *
 * A 307 and no-store, because the answer changes the moment somebody signs in.
 *
 * THE DEADLINE. This is the native shell's real cold-start path, and
 * `resolveSession()` makes a live round trip to GoTrue with no deadline of
 * its own. `home-or-landing/route.ts` hung a real device on the splash for
 * fifteen minutes for exactly this reason (2 October 2026) and was fixed at
 * f82f2148f; this route carried the same hang and is fixed the same way. The
 * real answer races a deadline, and on timeout a cheap guess from the auth
 * cookie's presence decides. A wrong guess is harmless: `/home` and the
 * signed-out start both pass back through `proxy.ts`'s own time-bounded gate
 * on the very next request.
 */
const OPEN_TIMEOUT_MS = 3000;

/** Cheap enough to call on every timeout: no network, just a cookie name. */
async function guessSignedIn(): Promise<boolean> {
  const jar = await cookies();
  return jar.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

async function signedInWithDeadline(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), OPEN_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([resolveSession(), timeout]);
    if (outcome === "timeout") return guessSignedIn();
    return outcome.state === "signed-in";
  } finally {
    clearTimeout(timer);
  }
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const target = (await signedInWithDeadline()) ? "/home" : signedOutStart();
  return NextResponse.redirect(new URL(target, request.url), {
    status: 307,
    headers: { "cache-control": "no-store" },
  });
}
