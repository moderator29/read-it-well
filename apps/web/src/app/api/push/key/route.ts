import { NextResponse } from "next/server";

import { VAPID_PUBLIC_KEY_VAR, webPushStatus } from "@/lib/push/credentials";
import { vapidKeysAgree, vapidPublicKeyIsValid } from "@/lib/push/transport/webpush";

/**
 * GET /api/push/key. The VAPID public key, which is public by design.
 *
 * A browser cannot subscribe without it: `pushManager.subscribe` takes it as
 * `applicationServerKey`, and it is what binds a subscription to us so that
 * nobody else can push to it. It is the PUBLIC half. Publishing it is the
 * intended use, not a leak, and the private half is never read here.
 *
 * WHY A ROUTE RATHER THAN THE `NEXT_PUBLIC_` VARIABLE IN THE BUNDLE. A
 * `NEXT_PUBLIC_` value is frozen into the build, so adding the key would need
 * a redeploy before a single device could subscribe. Read at request time, the
 * key can be set in the environment and push starts working on the next
 * request. For a credential nobody has yet supplied, that is the difference
 * between "set the variable" and "set the variable and rebuild".
 *
 * IT ALSO CHECKS THAT THE PAIR IS A PAIR. Two independently generated halves
 * pasted into the wrong variables sign a perfect JWT that every push service
 * answers 401 to, with nothing in the error saying why. Catching it here
 * means the failure is a clear message on the one route a person looks at
 * when push is not working, rather than a silent 401 on every send for ever.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): NextResponse {
  const status = webPushStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        configured: false,
        /* Variable names and who supplies them. Never a value. */
        missing: status.missing,
        supplier: status.supplier,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const publicKey = (process.env[VAPID_PUBLIC_KEY_VAR] ?? "").trim();

  if (!vapidPublicKeyIsValid(publicKey)) {
    return NextResponse.json(
      {
        configured: false,
        reason: "public_key_malformed",
        note: `${VAPID_PUBLIC_KEY_VAR} is set but is not an uncompressed P-256 point. Regenerate the pair with \`npx web-push generate-vapid-keys\`.`,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!vapidKeysAgree(publicKey, (process.env.VAPID_PRIVATE_KEY ?? "").trim())) {
    return NextResponse.json(
      {
        configured: false,
        reason: "keys_are_not_a_pair",
        note: "The public and private VAPID keys do not belong together. Every push would be refused 401 with no explanation. Regenerate both halves at once and set them together.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { configured: true, publicKey },
    {
      status: 200,
      /* Short, not long: the key is stable but a rotation must not be held
         in a thousand caches for a day. */
      headers: { "Cache-Control": "public, max-age=300" },
    },
  );
}
