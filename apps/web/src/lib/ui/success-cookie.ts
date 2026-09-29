import "server-only";
import { cookies } from "next/headers";
import { SUCCESS_COOKIE, SUCCESS_HINT_COOKIE, isGlobalDoneFlag, type GlobalDoneFlag } from "./success-moments";

/**
 * THE ACCOUNT MOMENTS RIDE ON A ONE-SHOT COOKIE, NOT ON THE ADDRESS.
 *
 * `?done=password-changed` was a link anybody could send: `/about?done=...`
 * said "Password changed" to a signed-out visitor, and the flag survived a
 * sign-in's `next=` and showed after an ordinary sign-in (SUCCESS-AUDIT,
 * phase 2). So an account moment is now two cookies, written here and only
 * by a server action AFTER the thing it names succeeded:
 *
 *   `nf_done`        HttpOnly, SameSite=Lax, two minutes: the flag itself.
 *                    Script cannot read or write it, so it cannot be forged
 *                    from a link or from the page.
 *   `nf_done_hint`   readable, carries only "1": it tells `SuccessFlagHost`
 *                    that there is something to ask for, so the host costs no
 *                    request on any other navigation. A forged hint gets
 *                    nothing: the server answers from `nf_done` alone.
 *
 * `consumeSuccess` (lib/ui/success-actions.ts) reads, checks against the
 * allow-list and deletes both, once. A layout cannot delete a cookie while it
 * renders, and a root layout does not re-render on a client navigation, which
 * is why the host asks rather than being told.
 */
const LIFETIME_S = 120;

export async function rememberSuccess(flag: GlobalDoneFlag): Promise<void> {
  if (!isGlobalDoneFlag(flag)) return;
  const jar = await cookies();
  jar.set(SUCCESS_COOKIE, flag, { path: "/", maxAge: LIFETIME_S, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  jar.set(SUCCESS_HINT_COOKIE, "1", { path: "/", maxAge: LIFETIME_S, sameSite: "lax", httpOnly: false, secure: process.env.NODE_ENV === "production" });
}

/** Read, check and delete, once. Server actions and route handlers only. */
export async function takeSuccess(): Promise<GlobalDoneFlag | null> {
  const jar = await cookies();
  const raw = jar.get(SUCCESS_COOKIE)?.value;
  jar.delete(SUCCESS_COOKIE);
  jar.delete(SUCCESS_HINT_COOKIE);
  return isGlobalDoneFlag(raw) ? raw : null;
}
