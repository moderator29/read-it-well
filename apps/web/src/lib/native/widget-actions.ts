"use server";

import { createHash, randomBytes } from "node:crypto";
import { resolveSession } from "../actions/session";
import { getAdminClient } from "../wallet/ledger";

/**
 * THE WIDGET'S DEVICE-BOUND TOKEN. V-98.
 *
 * Minted by the signed-in app on the phone and handed straight to the native
 * side (`lib/native/widget.ts`); only its SHA-256 is stored
 * (`public.widget_tokens`). It can do one thing: ask `/api/plans/next` for
 * the next commitment at area level. At most three live per account (the
 * oldest is revoked), ninety days each, and every one is revoked by
 * `revokeWidgetTokens` on sign-out.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export async function mintWidgetToken(label: unknown): Promise<{ token: string } | { error: "failed" }> {
  const session = await resolveSession();
  const admin = getAdminClient() as Loose;
  if (session.state !== "signed-in" || !admin) return { error: "failed" };
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const name = typeof label === "string" ? label.trim().slice(0, 40) || null : null;
  try {
    const { error } = await admin.from("widget_tokens").insert({ user_id: session.user.id, token_hash: hash, label: name });
    if (error) return { error: "failed" };
    /* Three live at most: a fourth phone retires the oldest. */
    const { data } = await admin
      .from("widget_tokens")
      .select("id")
      .eq("user_id", session.user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    const extra = Array.isArray(data) ? (data as { id: string }[]).slice(3).map((r) => r.id) : [];
    if (extra.length > 0) await admin.from("widget_tokens").update({ revoked_at: new Date().toISOString() }).in("id", extra);
    return { token };
  } catch {
    return { error: "failed" };
  }
}

export async function revokeWidgetTokens(): Promise<void> {
  const session = await resolveSession();
  const admin = getAdminClient() as Loose;
  if (session.state !== "signed-in" || !admin) return;
  try {
    await admin
      .from("widget_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .is("revoked_at", null);
  } catch {
    /* Best effort; each token still expires in ninety days. */
  }
}
