import { NextResponse } from "next/server";
import { readUnsubscribe, unsubscribeKey } from "@/lib/email/unsubscribe-token";
import { writeEmailPreferences } from "@/lib/email/preferences";

/**
 * A12. RFC 8058 ONE-CLICK UNSUBSCRIBE.
 *
 * POST (the mailbox provider, body `List-Unsubscribe=One-Click`, no cookie):
 * the signed token in the query names one account and one channel, and that
 * channel is switched off. 200 on success, 400 for a bad or expired token,
 * 503 when the store cannot be reached, so the provider can retry.
 *
 * GET (a person who opened the address, or a link scanner): NEVER
 * unsubscribes, because scanners prefetch every link in a mail. It sends the
 * person to the preferences page with the same token, where they choose.
 *
 * Public by exact path in `proxy.ts`; the token is the whole authorisation.
 */
export const dynamic = "force-dynamic";

function claimsOf(request: Request) {
  const key = unsubscribeKey();
  if (!key) return null;
  const token = new URL(request.url).searchParams.get("token");
  return readUnsubscribe(key, token, Math.floor(Date.now() / 1000));
}

export async function POST(request: Request) {
  const claims = claimsOf(request);
  if (!claims) {
    return NextResponse.json({ error: "invalid-token" }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  const written = await writeEmailPreferences(claims.userId, { [claims.channel]: false });
  return written
    ? NextResponse.json({ ok: true }, { status: 200, headers: { "cache-control": "no-store" } })
    : NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store", "retry-after": "300" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/email/preferences", url);
  const token = url.searchParams.get("token");
  if (token) target.searchParams.set("token", token);
  return NextResponse.redirect(target, { status: 303, headers: { "cache-control": "no-store" } });
}
