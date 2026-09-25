import { appUrl, button, compose, heading, hello, note, paragraph, rows } from "./render";
import type { EmailMessage } from "./messages";

/**
 * TRACK K: the email a person gets when the founder gives them staff access.
 * It names the exact access given, because "you are now staff" is not
 * something a person can check against what they were told.
 */
export function staffAccessGranted(data: { name: string | null; scopeWords: string }): EmailMessage {
  const { html, text } = compose({
    preheader: `Access given: ${data.scopeWords}.`,
    blocks: [
      heading("You have Vallo staff access"),
      paragraph(`${hello(data.name)} The Vallo founder gave your account access to the staff console.`),
      rows([{ label: "Access given", value: data.scopeWords, strong: true }]),
      paragraph(
        "Nothing unlocks until you read and acknowledge the staff handbook. Every decision you make is recorded with your name.",
      ),
      button("Read the handbook", appUrl("/admin/handbook")),
      note("If you did not expect this, tell the founder and do not open the console."),
    ],
    footerLines: ["You are receiving this because your account was given staff access on Vallo."],
  });
  return { subject: "You have Vallo staff access", html, text };
}
