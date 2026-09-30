/**
 * THE MEMBER KIT, in English (recommendations B5 to B17, 30 September 2026):
 * the scam shield on received messages, the viewing day kit, the renter's
 * question chips, the reply-time line, price context, what changed in an
 * agreement, the rent countdown, spoken money and increase contrast.
 *
 * Its own module for the reason `price-check.en.ts` gives: `en.ts` is written
 * by several people in the same hour, and a namespace here costs that file
 * one import and one line.
 *
 * THE CLAIMS RULE applies to every string. Each sentence says what the
 * platform does or what the record holds, never that a person or a place is
 * safe or checked. No em dashes.
 *
 * Other locales inherit these through `withFallback` until a speaker writes
 * them; the machine drafts that exist live in `member-kit.drafts.ts` and are
 * marked for native review there.
 */
export const memberKitEn = {
  /** B12: the calm row under a message that asks you to pay outside Vallo. */
  scam: {
    /** The row's accessible name. */
    label: "Safety note about this message",
    /** The founder's default wording. */
    lead: "Vallo never asks you to pay into a personal account.",
    /** Said when the message names a fee Vallo does not charge. */
    feeLead: "Vallo charges no inspection fee. Viewing a property through Vallo is free.",
    whatToDo: "What to do",
    hide: "Hide",
    report: "Report",
    stepDontTransfer: "Do not transfer money to an account somebody sends you in a chat. A transfer to a person cannot be pulled back by Vallo.",
    stepPayOnVallo: "Pay on Vallo.",
    stepReport: "Report this message so a person at Vallo can look at it. The sender is not told.",
    howPaying: "How paying on Vallo works",
    onlyYou: "Only you can see this note.",
  },
};

export type MemberKitCopy = typeof memberKitEn;
