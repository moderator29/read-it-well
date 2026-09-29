import "server-only";
import { cookies } from "next/headers";
import { SUCCESS_COOKIE, type GlobalDoneFlag } from "./success-moments";

/**
 * THE ACCOUNT MOMENTS RIDE ON A ONE-SHOT COOKIE, NOT ON THE ADDRESS.
 *
 * `?done=password-changed` was a link anybody could send: `/about?done=...`
 * said "Password changed" to a signed-out visitor, and the flag survived a
 * sign-in's `next=` and showed after an ordinary sign-in (SUCCESS-AUDIT,
 * phase 2). A cookie can only be set by this server or by script already
 * running on this origin, so it cannot be forged by a link. It is written
 * here, only after the action it names succeeded, lives two minutes, and is
 * read and deleted once by `SuccessFlagHost` on the next screen.
 *
 * Not HttpOnly, on purpose: the host has to read it and delete it on the
 * first screen it reaches, and a server layout cannot delete a cookie while
 * it renders. It carries a flag name and nothing else.
 */
export async function rememberSuccess(flag: GlobalDoneFlag): Promise<void> {
  const jar = await cookies();
  jar.set(SUCCESS_COOKIE, flag, { path: "/", maxAge: 120, sameSite: "lax", httpOnly: false });
}
