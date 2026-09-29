/**
 * SAVED REPLIES FOR THE SUPPORT DESK (29 September 2026).
 *
 * A support agent answers the same eight questions all day. A saved reply
 * lets them start from words that are already right: short, plain, warm, in
 * the product's own vocabulary, and never promising what another desk
 * decides. The agent always reads and edits before sending; a saved reply
 * fills the box, it never sends itself.
 *
 * The rules each one is held to (`support-macros.test.ts`):
 *  - at most 600 characters, and no exclamation marks;
 *  - none of the phrases the product's voice bans (lib/design/voice.ts) and
 *    no schedule promise (lib/copy/banned-phrases.ts);
 *  - never asks for a password, a one-time code, a PIN or a card number, and
 *    says so where the topic invites it;
 *  - never suggests paying or talking outside Vallo;
 *  - Vallo never holds a member's money: refunds go back to the card that
 *    paid, through Paystack.
 *
 * Placeholders: {first_name} and {reference}, filled from the ticket.
 * Client-safe: data and one pure function.
 */

export type SupportMacro = {
  id: string;
  /** What the agent sees in the picker. */
  title: string;
  /** When to use it, in one line. */
  when: string;
  body: string;
  /** The status the desk suggests after sending it (the agent chooses). */
  then: "keep" | "resolve";
};

export const SUPPORT_MACROS: readonly SupportMacro[] = [
  {
    id: "first-reply",
    title: "We have it",
    when: "The first reply, when you need a little time to look into it.",
    body:
      "Hello {first_name}, thank you for writing to us. I am looking into this now and I will reply on this thread, under {reference}, as soon as I have an answer. You do not need to write again in the meantime.",
    then: "keep",
  },
  {
    id: "need-detail",
    title: "Ask for the details",
    when: "You need a booking, a date or a screenshot before you can help.",
    body:
      "Hello {first_name}, so I can look at the right record, could you reply with the booking or agreement it is about, the date it happened, and a screenshot if you have one? Please do not send a password, a code or a card number: we never need them.",
    then: "keep",
  },
  {
    id: "refund-where",
    title: "Where is my refund",
    when: "A refund the member expected has not reached them.",
    body:
      "Hello {first_name}, Vallo never holds your money. A refund goes back to the card or account that paid, through Paystack, and your bank decides when it shows. I have asked our money team to trace this one. I will tell you here what they find.",
    then: "keep",
  },
  {
    id: "pay-outside",
    title: "Asked to pay outside Vallo",
    when: "Somebody asked the member to pay by transfer or in cash.",
    body:
      "Hello {first_name}, thank you for telling us. Please do not pay anyone outside Vallo: no inspection fee, no holding fee and no transfer to a personal account. Every real payment happens inside the app. I have passed this to our safety team, who will look at the account that asked.",
    then: "keep",
  },
  {
    id: "handed-on",
    title: "Handed to another team",
    when: "You escalated the ticket and want the member to know it is moving.",
    body:
      "Hello {first_name}, I have passed this to the team that decides it, with everything you told us. You will hear from us on this same thread, under {reference}, and you do not need to start a new one.",
    then: "keep",
  },
  {
    id: "verification-help",
    title: "Verification help",
    when: "A member is stuck on an identity or business check.",
    body:
      "Hello {first_name}, verification is checked by a person, not a machine. If a document was sent back, the reason is on your verification screen; uploading a clear, whole, unedited photo usually settles it. I have asked the verification team to look at yours.",
    then: "keep",
  },
  {
    id: "account-access",
    title: "Cannot sign in",
    when: "The member is locked out or not receiving their sign-in email.",
    body:
      "Hello {first_name}, you can reset your password from the sign-in screen with Forgot password. If the email does not arrive, check the spam folder and reply here with the address you signed up with. We will never ask you for your password or a code.",
    then: "keep",
  },
  {
    id: "resolved",
    title: "Sorted, closing",
    when: "The question is answered and nothing is left to do.",
    body:
      "Hello {first_name}, I am marking this as resolved. If it is not sorted, you can reopen it from Messages within 14 days, or start a new question at any time.",
    then: "resolve",
  },
];

export function macroById(id: string): SupportMacro | null {
  return SUPPORT_MACROS.find((m) => m.id === id) ?? null;
}

/**
 * A saved reply with its placeholders filled. A missing first name reads
 * "Hello there", never "Hello ," or "Hello {first_name}".
 */
export function fillMacro(macro: SupportMacro, context: { firstName?: string | null; reference?: string | null }): string {
  const name = (context.firstName ?? "").trim().split(/\s+/)[0] ?? "";
  const reference = (context.reference ?? "").trim();
  return macro.body
    .replaceAll("{first_name}", name || "there")
    .replaceAll("{reference}", reference || "your ticket");
}
