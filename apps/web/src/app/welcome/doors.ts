import { withNext } from "@/lib/auth/next-link";

/**
 * GET STARTED'S TWO DOORS, AND THE COLD-START HANDOFF THEY USED TO DROP.
 *
 * THE FINDING (Session 3 handoff, section 2: "cold-start sign-up never reaches
 * the onboarding questions"). A stranger on a cold start pressed Get started
 * and went to a bare `/sign-up`. With no `next`, every sign-up path lands on
 * `/home` (`landingAfterAuth` in `lib/auth/actions.ts`), so the interests and
 * arrival questions on `/welcome` were reached only if `/home`'s own gate
 * (`askIntent`) happened to send the new member back, after Home had paid for
 * its reads and drawn its first byte. The questions were a side effect of a
 * redirect on another page rather than the next step of the flow the person
 * was in.
 *
 * THE FIX IS ONLY ROUTING, AND IT ADDS NO STEP. The Get started door now
 * carries `next=/welcome`, so the account is made and the person lands
 * straight on the question beat of the flow they started (`planFirstRun`'s
 * member branch: the question, with the arrival asks, and the intro already
 * seen so the slides are not repeated). The steps are the same steps in the
 * same order (D28); the difference is that the handoff is the flow's and not
 * an accident of `/home`. Somebody who has already answered (never a new
 * account) is sent straight on to `/home` by `planFirstRun`.
 *
 * A door the person was already on their way through keeps its address, and
 * a sign-up door that already carries a destination keeps that destination:
 * somebody stopped on the way to a listing goes back to the listing.
 */
export const COLD_START_NEXT = "/welcome";

const SIGN_UP = /^\/sign-up(?:[/?#]|$)/;
const SIGN_IN = /^\/sign-in(?:[/?#]|$)/;

function hasNext(path: string): boolean {
  const q = path.indexOf("?");
  if (q === -1) return false;
  try {
    return new URLSearchParams(path.slice(q + 1).split("#")[0]).has("next");
  } catch {
    return false;
  }
}

export function introDoors(next: string | null): { signUp: string; signIn: string } {
  let signUp = withNext("/sign-up", COLD_START_NEXT);
  if (next && SIGN_UP.test(next)) {
    signUp = hasNext(next) ? next : withNext(next.split(/[?#]/)[0] ?? "/sign-up", COLD_START_NEXT);
  }
  const signIn = next && SIGN_IN.test(next) ? next : "/sign-in";
  return { signUp, signIn };
}
