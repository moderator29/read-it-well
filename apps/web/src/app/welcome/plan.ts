import type { InterestsState } from "@/lib/interests/queries";
import { isAuthDoor } from "@/components/app/welcome/first-run-seen";

/**
 * Who sees what at `/welcome`, as one pure function so it can be tested
 * without a server, a session or a browser.
 *
 * THE RULES, in the order they are applied:
 *
 * A stranger (signed out, or a platform with no keys yet):
 *   never shown before           the slides from the first one.
 *   shown before, going somewhere carry on there; first run is not a toll.
 *   shown before, no destination  straight to the closing choice, so a
 *                                returning visitor meets the three doors and
 *                                not the introduction again.
 *
 * Somebody signed in:
 *   the slides count as seen when EITHER their profile says so or this device
 *   does, so a person who read them before creating an account is not shown
 *   them a second time on the far side of sign up.
 *   seen and the interests question answered or skipped: nothing left here,
 *   so home (or the place they were going, unless that was a sign-in door).
 *   otherwise: first run, starting at the slides or at the question.
 */
export type FirstRunPlan =
  | { kind: "redirect"; to: string }
  | { kind: "guest"; startAt: "first" | "choice"; next: string | null }
  | {
      kind: "member";
      next: string | null;
      intent: {
        interests: Extract<InterestsState, { state: "signed-in" }>["interests"];
        asked: boolean;
        welcomeSeen: boolean;
      };
    };

export function planFirstRun({
  session,
  deviceSeen,
  next,
}: {
  session: InterestsState;
  deviceSeen: boolean;
  next: string | null;
}): FirstRunPlan {
  if (session.state !== "signed-in") {
    if (deviceSeen && next) return { kind: "redirect", to: next };
    return { kind: "guest", startAt: deviceSeen ? "choice" : "first", next };
  }

  const asked = session.asked || session.interests.length > 0;
  const welcomeSeen = session.welcomeSeen || deviceSeen;
  const onward = next && !isAuthDoor(next) ? next : null;

  if (asked && welcomeSeen) return { kind: "redirect", to: onward ?? "/home" };

  return {
    kind: "member",
    next: onward,
    intent: { interests: session.interests, asked, welcomeSeen },
  };
}
