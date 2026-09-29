import { appUrl, button, compose, heading, hello, note, paragraph, shortTitle } from "./render";
import type { EmailMessage } from "./messages";

/**
 * THE RECALL (V-60): an account somebody talked to was stopped for fraud.
 *
 * It names the listing, which is the recipient's own conversation and the only
 * handle they need, and never the account, the reporter or the stop's reason:
 * a public accusation by email is defamation risk and teaches nothing a person
 * can act on. It says what to do in order: do not pay anything more, tell Vallo
 * what was paid, and read the steps.
 *
 * The category is one of two, and each has its own sentence; anything else is
 * no email at all.
 */

export type ScamRecallData = {
  name?: string | null;
  /** The listing the recipient talked about, or null when it is gone. */
  listingTitle?: string | null;
  category: "off_platform_payment" | "scam";
};

const WHY: Record<ScamRecallData["category"], string> = {
  off_platform_payment: "for asking people to pay outside Vallo",
  scam: "for breaking Vallo's safety rules",
};

export function scamRecall(data: ScamRecallData): EmailMessage {
  const about = data.listingTitle ? ` about ${data.listingTitle}` : "";
  const composed = compose({
    preheader: data.listingTitle
      ? `It was about ${shortTitle(data.listingTitle, 40)}. If you paid them anything, tell us now.`
      : "If you paid them anything, tell us now.",
    blocks: [
      heading("An account you talked to has been stopped"),
      paragraph(`${hello(data.name)} An account you talked to${about} was stopped by Vallo ${WHY[data.category]}.`),
      paragraph("If you have not paid them anything, do not. There is nothing else to do."),
      paragraph(
        "If you paid them anything, in any way, tell us now: what you paid, when and to which account. The sooner a bank hears, the more often money comes back.",
      ),
      button("What to do next", appUrl("/safety")),
      note("Vallo will never ask you to pay anybody outside Vallo, and nobody from Vallo will ask for your password or a code."),
    ],
    footerLines: [
      "You are receiving this because you talked to this account on Vallo in the last two months.",
      "This is a safety notice. It is always sent and it cannot be switched off.",
    ],
  });
  return {
    subject: "An account you talked to was stopped",
    preheader: composed.preheader,
    html: composed.html,
    text: composed.text,
  };
}
