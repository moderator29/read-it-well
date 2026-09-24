import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { consume, ipFromHeaders, subjectForIp } from "@/lib/security/rate-limit";
import { getAdminClient } from "@/lib/wallet/ledger";

/**
 * GET /api/plans/next. THE HOME-SCREEN WIDGET'S ONE QUESTION. V-98.
 *
 * `Authorization: Bearer <device token>`, a token minted by the signed-in
 * app on that phone (`lib/native/widget-actions.ts`), looked up by its
 * SHA-256. The answer is the person's next commitment at AREA level, built by
 * `public.widget_next_up`: an inspection (when, area and state, the other
 * party's first name and initial) or a check-in (the date, area and state),
 * or "nothing". Never an address, an amount or a reference.
 *
 * A public API path, because a widget has no session; the token is the
 * authorisation, and an unknown, revoked or expired one gets a 401. Six
 * hundred a minute per address FIRST (so a stream of made-up tokens cannot
 * each open a fresh bucket), then sixty per token. Six hundred, not fewer,
 * because Nigerian mobile networks put thousands of phones behind one
 * carrier-grade NAT address, and a widget refreshing every fifteen minutes
 * on each of them must not starve the rest; a guesser still gets no more
 * than 600 tries a minute per address against 256-bit tokens. A limiter
 * that cannot count refuses: this route is public. Never cached.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "cache-control": "no-store" };

export async function GET(request: Request): Promise<NextResponse> {
  const byIp = await consume({ bucket: "widget_next_up_ip", subject: subjectForIp(ipFromHeaders(request.headers)), limit: 600, windowSeconds: 60 });
  if (!byIp.allowed || byIp.degraded) {
    return NextResponse.json({ ok: false, reason: "slow_down" }, { status: 429, headers: HEADERS });
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401, headers: HEADERS });
  }
  const hash = createHash("sha256").update(token).digest("hex");
  const verdict = await consume({ bucket: "widget_next_up", subject: `widget:${hash.slice(0, 32)}`, limit: 60, windowSeconds: 60 });
  if (!verdict.allowed || verdict.degraded) return NextResponse.json({ ok: false, reason: "slow_down" }, { status: 429, headers: HEADERS });

  const admin = getAdminClient() as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  } | null;
  if (!admin) return NextResponse.json({ ok: false, reason: "not_configured" }, { status: 503, headers: HEADERS });

  const { data, error } = await admin.rpc("widget_next_up", { p_token_hash: hash });
  if (error || !data || typeof data !== "object") {
    return NextResponse.json({ ok: false, reason: "failed" }, { status: 500, headers: HEADERS });
  }
  const answer = data as Record<string, unknown>;
  if (answer.status === "unauthorised") {
    return NextResponse.json({ ok: false, reason: "unauthorised" }, { status: 401, headers: HEADERS });
  }
  return NextResponse.json({ ok: true, next: pick(answer) }, { headers: HEADERS });
}

/** Only the fields the widget draws, whatever the function returns. */
function pick(answer: Record<string, unknown>): Record<string, string | null> {
  const text = (key: string) => (typeof answer[key] === "string" ? (answer[key] as string).slice(0, 80) : null);
  return {
    kind: text("kind"),
    at: text("at"),
    on: text("on"),
    area: text("area"),
    state: text("state"),
    person: text("person"),
    role: text("role"),
    href: text("href"),
  };
}
