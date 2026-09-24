import { redirect } from "next/navigation";
import { resolveSession } from "./session";

/**
 * The page's own sign-in gate, for the form pages the proxy lets a signed-out
 * server action reach (`SELF_GUARDING_FORM_PATHS` in proxy.ts).
 *
 * The proxy redirects a signed-out page load before it gets here. What does
 * get here signed out is an action POST, and when an action revalidates, Next
 * renders the page into the action's response. A page that did not check the
 * session itself would then be drawn for nobody. This sends that render to
 * sign in, the same address the proxy uses, and lets every other state
 * (signed in, or no platform keys in a preview) through unchanged.
 */
export async function requireSignedInPage(path: string): Promise<void> {
  const session = await resolveSession();
  if (session.state === "signed-out") {
    redirect(`/sign-in?next=${encodeURIComponent(path)}&notice=sign-in-required`);
  }
}
