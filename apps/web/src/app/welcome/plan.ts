import type { InterestsState } from "@/lib/interests/queries";
import { firstRunNext, isAuthDoor } from "@/components/app/welcome/first-run-seen";
import { isPropertyType, type PropertyType } from "@/lib/interests/schema";

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
  | {
      kind: "guest";
      next: string | null;
      /**
       * Where the stranger was actually going, when they were going somewhere.
       * Present means the slides are skipped and the choice is headed with it
       * (V-18). Absent means a cold start: the store install, the typed
       * domain, Get started on the landing page.
       */
      arrival: Arrival | null;
    }
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
  carried = null,
}: {
  session: InterestsState;
  next: string | null;
  /**
   * The market a landing tile named before this person had an account,
   * carried on the device (`FIRST_INTEREST_COOKIE`). It pre-ticks the
   * interests question and nothing else: it is never saved until they press
   * Continue, and it is ignored once they have answered.
   */
  carried?: PropertyType | null;
}): FirstRunPlan {
  if (session.state !== "signed-in") return { kind: "guest", next, arrival: arrivalOf(next) };
  return {
    kind: "member",
    next: next && !isAuthDoor(next) ? next : null,
    intent: {
      interests:
        session.interests.length === 0 && !session.asked && carried
          ? [carried]
          : session.interests,
      asked: session.asked || session.interests.length > 0,
    },
  };
}

/* ------------------------------------------------------------------------ */
/* ARRIVALS WITH A DESTINATION (V-18)                                        */
/* ------------------------------------------------------------------------ */

/**
 * What the person asked for, in the four shapes the choice screen can name.
 *
 * A visitor who tapped "Lagos" on the landing page used to read four slides
 * that never mention Lagos before being offered an account. Somebody who
 * arrives WITH a destination has already decided what they want to see; the
 * slides are for the cold start, and the wall should say what is behind it.
 *
 *   search   `/search`, with the words they searched for when there were any
 *   listing  `/listing/<id>`, a property somebody shared
 *   stay     `/stay/<id>` or the Stays shelf
 *   other    anything else inside the platform
 */
export type ArrivalReason =
  | { kind: "search"; place: string | null }
  | { kind: "listing" }
  | { kind: "stay" }
  | { kind: "other" };

export type Arrival = {
  /** The same-origin path they were going to, already vetted. */
  destination: string;
  reason: ArrivalReason;
  /**
   * The market the landing tile they tapped names, when it names one, so the
   * interests question after sign-up can arrive with it already ticked. Only
   * ever a real `property_type`; a city is not an interest.
   */
  interest: PropertyType | null;
};

/* A search term is printed in a heading, so it is capped; React escapes it. */
const PLACE_MAX = 40;

function readParam(search: string, key: string): string | null {
  try {
    const value = new URLSearchParams(search).get(key);
    return value === null ? null : value;
  } catch {
    return null;
  }
}

function splitPath(path: string): { pathname: string; search: string } {
  const q = path.indexOf("?");
  const pathname = (q === -1 ? path : path.slice(0, q)).split("#")[0] ?? "";
  const search = q === -1 ? "" : (path.slice(q).split("#")[0] ?? "");
  return { pathname: pathname.replace(/\/+$/, "") || "/", search };
}

/**
 * Read the destination out of `next`, unwrapping one door.
 *
 * The wall in `proxy.ts` sends a stranger to `/sign-in?next=<where>`, and the
 * sign-in screen hands a first-time device to `/welcome?next=<that sign-in
 * address>`. So the thing the person asked for is usually one level down. A
 * bare door (`/sign-in` tapped on its own) has no destination at all, and a
 * door inside a door is not followed any further.
 *
 * Pure, and it never throws: rubbish in means `null` out, which is the cold
 * start and shows the slides.
 */
export function arrivalOf(next: string | null): Arrival | null {
  if (!next) return null;
  let destination: string | null = next;
  if (isAuthDoor(next)) {
    const inner = readParam(splitPath(next).search, "next");
    destination = firstRunNext(inner);
    if (!destination || isAuthDoor(destination)) return null;
  }
  if (!destination) return null;

  const { pathname, search } = splitPath(destination);
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] ?? "";
  const typeParam = readParam(search, "type");
  const interest = typeParam && isPropertyType(typeParam) ? typeParam : null;

  let reason: ArrivalReason;
  if (first === "search") {
    const raw = (readParam(search, "q") ?? "").trim().replace(/\s+/g, " ");
    reason = { kind: "search", place: raw.length > 0 ? raw.slice(0, PLACE_MAX) : null };
  } else if (first === "listing" && segments.length >= 2) {
    reason = { kind: "listing" };
  } else if (first === "stay" || first === "stays") {
    reason = { kind: "stay" };
  } else {
    reason = { kind: "other" };
  }
  return { destination, reason, interest };
}
