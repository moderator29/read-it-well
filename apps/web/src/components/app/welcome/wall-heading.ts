import type { ArrivalReason } from "@/app/welcome/plan";
import { NIGERIAN_STATES } from "@/lib/data/nigeria";

/**
 * The words on the wall, for somebody who was stopped on the way somewhere
 * (V-18).
 *
 * "Sign in to open that" said nothing about what "that" was, and the four
 * slides in front of it never mentioned it either. The heading now names the
 * thing: the place they searched for, the listing that was shared with them,
 * the stay. It is a pure function over the dictionary so the four shapes are
 * tested without rendering the carousel.
 *
 * THE VERB DECIDES THE PRIMARY DOOR. A search is somebody browsing, who is more
 * likely new than returning, so it leads with Create an account. A shared
 * listing or stay is usually opened by somebody who was sent it, and a link
 * sent between people is as likely to reach an existing member, so it leads
 * with Sign in. Either way both doors are on the screen.
 *
 * A SEARCH TERM IS ONLY CALLED A PLACE WHEN WE KNOW IT IS ONE. "Lagos" reads
 * as "homes in Lagos". "Mars" must not: "homes in Mars" claims homes exist
 * there (batch 1 review, finding 8). So a term that names one of the 37 states
 * or one of the cities the catalogue covers is a place, and anything else is
 * quoted back as typed: "to search for “Mars”".
 */
export type WallCopy = {
  create: string;
  signIn: string;
  searchPlace: string;
  searchQuoted: string;
  searchAny: string;
  listing: string;
  stay: string;
  other: string;
  body: string;
};

export type WallHeading = {
  titleA: string;
  titleB: string;
  body: string;
  primary: "sign-in" | "sign-up";
};

/* The cities discovery maps and the landing page offers, beside the states. */
const KNOWN_CITIES = ["Lagos", "Abuja", "Ibadan", "Enugu", "Port Harcourt", "Calabar", "Kano", "Benin City"];

const KNOWN_PLACES = new Set(
  [...NIGERIAN_STATES.map((state) => state.replace(/\s*\(.*\)$/, "")), "FCT", ...KNOWN_CITIES].map((name) =>
    name.toLowerCase(),
  ),
);

/** A state or a covered city, whatever the case and spacing it was typed in. */
export function isKnownPlace(term: string): boolean {
  return KNOWN_PLACES.has(term.trim().replace(/\s+/g, " ").toLowerCase());
}

export function wallHeading(reason: ArrivalReason, copy: WallCopy): WallHeading {
  switch (reason.kind) {
    case "search": {
      const place = reason.place;
      const titleB = !place
        ? copy.searchAny
        : isKnownPlace(place)
          ? copy.searchPlace.replace("{place}", place)
          : copy.searchQuoted.replace("{term}", place);
      return { titleA: copy.create, titleB, body: copy.body, primary: "sign-up" };
    }
    case "listing":
      return { titleA: copy.signIn, titleB: copy.listing, body: copy.body, primary: "sign-in" };
    case "stay":
      return { titleA: copy.signIn, titleB: copy.stay, body: copy.body, primary: "sign-in" };
    default:
      return { titleA: copy.signIn, titleB: copy.other, body: copy.body, primary: "sign-in" };
  }
}
