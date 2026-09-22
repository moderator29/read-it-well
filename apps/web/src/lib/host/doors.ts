/**
 * THE THREE STAYS DOORS, as `GOVERNING-09` screen three draws them.
 *
 * WHAT WAS THERE BEFORE. One door, `/host/apply`, whose first step asked "what
 * kind of host are you" and offered the three HOST TYPES: an individual, a
 * registered hospitality business, a restaurant. That is the shape of the
 * PROOF we need from somebody, and it is the right first question for a form.
 * It is the wrong first question for a person, who does not think of
 * themselves as an individual or a registered hospitality business. They think
 * "we are a hotel", "I run a shortlet", "we are a restaurant", which is what
 * the render asks and what this file holds.
 *
 * SO A DOOR IS NOT A FOURTH HOST TYPE. It is a named way in that answers the
 * first two questions of the existing wizard on the person's behalf: the host
 * type, which decides which proof is asked for, and the business kind, which
 * decides what the rows mean. Nothing else about the wizard changes, the step
 * list is still `stepsFor(hostType)`, and Back from the second step lands on
 * the host type question with the door's answer filled in, so a hotel that
 * turns out to be unregistered can say so rather than being trapped.
 *
 * WHY HOTEL IS THE REGISTERED BRANCH AND SHORTLET IS NOT. The research is
 * plain about it (`HOST_ONBOARDING_RESEARCH.md` sections 1.3 and 2.1): an
 * individual letting a furnished flat may hold no CAC registration at all, and
 * demanding one would cut out most of the real Nigerian shortlet supply, while
 * a hotel operated as a company is expected to be registered and the render's
 * own hotel screen asks for an RC number. The door carries that difference
 * instead of making every host read the three host type definitions to find
 * out which one they are.
 */

import type { BusinessKind, HostType } from "./onboarding";
import type { BrandIconName } from "@/design-system/icons/BrandIcon";

export type StaysDoorId = "hotel" | "shortlet" | "restaurant";

export type StaysDoor = {
  id: StaysDoorId;
  /** In the operator's own words, as the render has them. */
  title: string;
  /** What is behind the door, so nobody has to open it to find out. */
  meaning: string;
  mark: BrandIconName;
  /** The answer this door gives to the wizard's first question. */
  hostType: HostType;
  kind: BusinessKind;
};

export const STAYS_DOORS: readonly StaysDoor[] = [
  {
    id: "hotel",
    title: "We are a hotel",
    meaning: "Rooms, rates and bookings.",
    mark: "hotel",
    hostType: "business",
    kind: "hotel",
  },
  {
    id: "shortlet",
    title: "I run a shortlet",
    meaning: "One place or several, by the night.",
    mark: "keys-home",
    hostType: "individual",
    kind: "shortlet_operator",
  },
  {
    id: "restaurant",
    title: "We are a restaurant",
    meaning: "Tables, hours and reservations.",
    mark: "concierge-bell",
    hostType: "restaurant",
    kind: "restaurant",
  },
] as const;

/** The door a query string names, or null when it names none of them. */
export function doorFrom(value: string | null | undefined): StaysDoor | null {
  return STAYS_DOORS.find((door) => door.id === value) ?? null;
}
