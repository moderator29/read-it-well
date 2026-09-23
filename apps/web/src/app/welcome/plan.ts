import type { InterestsState } from "@/lib/interests/queries";
import { isAuthDoor } from "@/components/app/welcome/first-run-seen";

/**
 * Who sees what at `/welcome`, as one pure function so it can be tested
 * without a server, a session or a browser.
 *
 * THE FOUNDER'S RULE, 23 SEPTEMBER (item 6): "Whenever anybody taps Get
 * Started on the landing page, it shows, every time, even if they are
 * already signed in. It is also the first screen anybody sees when they open
 * the app, and the first screen before any sign up." So `/welcome` never
 * redirects: it renders from the first slide for everybody who asks for it.
 * What changes with who is looking is only the ending:
 *
 *   a stranger (signed out, or a platform with no keys)  Create account and
 *                                                        Sign in, keeping
 *                                                        where they were going
 *   somebody signed in                                   one Continue into the
 *                                                        app, through the
 *                                                        interests question
 *                                                        only while it is
 *                                                        unanswered
 *
 * The device's seen-once cookie no longer suppresses this screen. It is
 * still written, because sign up and sign in use it to decide whether a
 * first-time visitor detours through here (scope requests W1, W2).
 */
export type FirstRunPlan =
  | { kind: "guest"; next: string | null }
  | {
      kind: "member";
      /** Where Continue goes after the question; never a sign-in door. */
      next: string | null;
      intent: {
        interests: Extract<InterestsState, { state: "signed-in" }>["interests"];
        asked: boolean;
      };
    };

export function planFirstRun({
  session,
  next,
}: {
  session: InterestsState;
  next: string | null;
}): FirstRunPlan {
  if (session.state !== "signed-in") return { kind: "guest", next };
  return {
    kind: "member",
    next: next && !isAuthDoor(next) ? next : null,
    intent: {
      interests: session.interests,
      asked: session.asked || session.interests.length > 0,
    },
  };
}
