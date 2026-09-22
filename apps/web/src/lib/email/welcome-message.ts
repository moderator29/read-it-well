/**
 * The welcome email: the first thing Vallo ever sends somebody unprompted.
 *
 * Moved here from `messages.ts` so its design and words have one home of their
 * own. `messages.ts` re-exports `welcome` and its types, so no caller changes:
 * `lib/notify/welcome.ts` (the send, the `welcomed_at` guard) still imports
 * from the catalogue exactly as before.
 */

import type { EmailMessage } from "./messages";
import {
  appUrl,
  bullets,
  button,
  compose,
  heading,
  hello,
  note,
  paragraph,
  type Block,
} from "./render";

/** The safety line for somebody about to pay or about to meet a lister. */
const MONEY_SAFETY_LINE =
  "Keep your chats and your payments inside Vallo, and pay only after you have inspected the property.";

/** The same guidance, stated to a lister about the people contacting them. */
const LISTER_SAFETY_LINE =
  "Vallo asks everybody to keep chats and payments inside Vallo and to pay only after inspecting.";

/**
 * What somebody said they came here to do.
 *
 * Mirrors `public.signup_role`. A DECLARATION and never a permission: choosing
 * "agent" here does not make anybody an agent, which still needs the
 * application, the ID and the approval. It decides which welcome this is.
 */
export type SignupRole = "renter" | "buyer" | "landlord" | "seller" | "agent";

export type WelcomeData = {
  name?: string | null;
  /** Null when they were never asked, or skipped. That is an ordinary state. */
  role?: SignupRole | null;
};

/**
 * The welcome, written five times over plus a general one.
 *
 * A single welcome that lists everything the platform does is a brochure, and
 * a brochure is what people archive without reading. Somebody who came here to
 * find a flat has one useful next step and it is not "list your property".
 *
 * Each version says the same three things in the reader's own terms: what to
 * do next, what protects them, and one true thing about how this market works
 * that they will be glad to know before they start. The last of those is the
 * part a generic welcome cannot do at all.
 *
 * The general version is not a lesser one. It is the honest answer when
 * nothing was declared, and it names the two directions rather than guessing.
 */
/**
 * Every welcome, with the one footer line that says where the switch is.
 *
 * The settings card promises a person can turn Vallo's email off, so the very
 * first email Vallo sends says where that is, in the small print, which is
 * where somebody looks for it. It is not an unsubscribe and does not call
 * itself one: this message is transactional, there is nothing to unsubscribe
 * from, and an unsubscribe needs List-Unsubscribe headers the client does not
 * send yet. Offering the real switch is the honest version of the gesture.
 */
function welcomeShell(
  subject: string,
  preheader: string,
  blocks: readonly (Block | null | undefined | false)[],
  footerLines: readonly string[],
): EmailMessage {
  const { html, text } = compose({
    preheader,
    blocks,
    footerLines,
    footerLink: {
      label: "Change what Vallo emails you",
      href: appUrl("/settings/notifications"),
    },
  });
  return { subject, html, text };
}

export function welcome(data: WelcomeData): EmailMessage {
  const greeting = hello(data.name);

  switch (data.role) {
    case "renter":
      return welcomeShell(
        "Welcome to Vallo",
        "Start with search, and read the total move-in cost before you plan a viewing.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You are here to find somewhere to live, so here is what is worth knowing before you start looking.`,
          ),
          paragraph(
            "Every listing on Vallo was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message and somebody to inspect the place with.",
          ),
          paragraph(
            "The rent is rarely the whole number. Caution deposit, agency fee, legal fee, agreement fee and service charge are normal here, and together they are often half as much again. Where a listing states its total move-in cost, that is the figure to plan around.",
          ),
          bullets([
            "Search by area, then filter on the total move-in cost rather than the rent.",
            "Message the lister inside Vallo and ask your questions in writing.",
            "Inspect the property in person before any money moves.",
            "Pay through Vallo, so there is a record of what you paid, to whom and when. Never send money outside the platform, whatever the reason given.",
          ]),
          button("Start searching", appUrl("/search")),
          note(
            "Nobody at Vallo will ever ask you to pay outside the platform. If somebody does, report them from the listing.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );

    case "buyer":
      return welcomeShell(
        "Welcome to Vallo",
        "Start with search, and never let money move before a lawyer has seen the title.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You are here to buy, so the most useful thing we can tell you first is about title.`,
          ),
          paragraph(
            "Certificate of occupancy, governor's consent, deed of assignment, gazette, freehold and leasehold are not interchangeable words. Every listing for sale on Vallo states which one the seller claims, and states plainly when none was given.",
          ),
          paragraph(
            "We record the claim. We cannot verify it, and nobody who is not a lawyer at the land registry can. Have yours do a search before any money moves, however good the paperwork looks.",
          ),
          bullets([
            "Search by area and filter on the title you are willing to accept.",
            "Message the seller inside Vallo and keep every answer in writing.",
            "Inspect the property, and have a lawyer verify title at the registry.",
            "Pay through Vallo, so there is a record of what you paid, to whom and when. Never send money outside the platform, whatever the reason given.",
          ]),
          button("Browse property for sale", appUrl("/search")),
          note(
            "Nobody at Vallo will ever ask you to pay outside the platform. If somebody does, report them from the listing.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );

    case "landlord":
      return welcomeShell(
        "Welcome to Vallo",
        "List your property, and get verified so people trust what you have written.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You have property to let, so here is what makes a listing on Vallo work.`,
          ),
          paragraph(
            "State the whole cost. Rent, caution deposit, agency, legal, agreement and service charge, and the total somebody actually has to find. Listings that state the total get far fewer wasted viewings, because the people who arrive have already decided they can afford it.",
          ),
          paragraph(
            "Then get verified. The badge is not decoration: it is how somebody scrolling past decides that you are real. The ladder runs from your phone number to your ID, then your address, then a physical inspection of the property.",
          ),
          bullets([
            "Add the property, with photographs and a walkthrough video if you can.",
            "Answer the light, water and gate questions. People filter on them.",
            "State the total move-in cost, not only the rent.",
            "Work up the verification ladder from Settings.",
          ]),
          button("List your property", appUrl("/agent/listings/new")),
          note(
            "Keep every conversation and payment inside Vallo. It is the record that protects you as much as it protects your tenant.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    case "seller":
      return welcomeShell(
        "Welcome to Vallo",
        "List your property, and state the title you hold.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You have property to sell, so state your title first and everything else follows.`,
          ),
          paragraph(
            "Buyers on Vallo filter on title before they filter on price. A listing that names its certificate of occupancy or its governor's consent is taken seriously; one that says nothing is assumed to have nothing, whether or not that is fair.",
          ),
          paragraph(
            "Photographs sell a viewing, a walkthrough video sells the property. A continuous walk through the building and out to the gate answers more questions than twenty stills, and it is the thing a serious buyer asks for.",
          ),
          bullets([
            "Add the property, the asking price and the title you hold.",
            "Upload photographs, and a walkthrough video where you can.",
            "Work up the verification ladder from Settings.",
            "Answer enquiries inside Vallo, so the conversation is on the record.",
          ]),
          button("List your property", appUrl("/agent/listings/new")),
          note(
            "Keep every conversation and payment inside Vallo. It is the record that protects you as much as it protects your buyer.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    case "agent":
      return welcomeShell(
        "Welcome to Vallo",
        "Apply to be verified, then list. Verification is what earns reach here.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} You do this for a living, so the part worth your attention is verification.`,
          ),
          paragraph(
            "Vallo carries no listings from outside feeds. Everything here was put up by somebody here, and the verification ladder is how a reader tells one lister from another: phone, then identity document, then address, then a physical inspection of a property.",
          ),
          paragraph(
            "Reach follows the ladder. A verified agent's listings rank above an unverified one at equal relevance, and that is the only thing on this platform that money cannot buy.",
          ),
          bullets([
            "Apply from your profile: your details, your business area and a valid ID.",
            "Applications and verification documents are answered within 3 days.",
            "Once approved, publish listings and answer enquiries inside Vallo.",
            "State the full move-in cost on every rental. It is what people shop on.",
          ]),
          button("Apply to be an agent", appUrl("/agent/apply")),
          note(
            "Vallo charges you nothing to list or to be verified.",
          ),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          LISTER_SAFETY_LINE,
        ],
      );

    default:
      return welcomeShell(
        "Welcome to Vallo",
        "Everything here was listed by a real person. Here is how it works.",
        [
          heading("Welcome to Vallo"),
          paragraph(
            `${greeting} Vallo is a Nigerian property marketplace for renting, buying and selling.`,
          ),
          paragraph(
            "Every listing was put up by a real person on Vallo. Nothing is imported from an outside feed, so there is always somebody to message, somebody to inspect the place with, and somebody accountable for what a listing says.",
          ),
          paragraph(
            "Pay inside Vallo and there is a record of what you paid, to whom and when, which is what we can act on when something goes wrong. The person behind a listing climbs a verification ladder you can see: phone, identity document, address, then a physical inspection.",
          ),
          bullets([
            "Looking for somewhere: start with search and filter on the total move-in cost.",
            "Have property: add it from your profile and work up the verification ladder.",
          ]),
          button("Start searching", appUrl("/search")),
          note("Nobody at Vallo will ever ask you to pay outside the platform."),
        ],
        [
          "You are receiving this because you created a Vallo account.",
          MONEY_SAFETY_LINE,
        ],
      );
  }
}
