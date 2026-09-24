import { NextResponse } from "next/server";

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
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await resolveSession();
  const target = session.state === "signed-in" ? "/home" : signedOutStart();
  return NextResponse.redirect(new URL(target, request.url), {
    status: 307,
    headers: { "cache-control": "no-store" },
  });
}
