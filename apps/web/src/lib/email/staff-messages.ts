import { appUrl, bullets, button, compose, fitSubject, heading, hello, note, paragraph, rows } from "./render";
import type { EmailMessage } from "./messages";
import { JOB_DESCRIPTIONS, type StaffPosition } from "../admin/staff-positions";

/** "Access given: Support tickets. Read the handbook first." when it fits. */
function accessLine(scopeWords: string): string {
  const line = `Access given: ${scopeWords.trim()}. Read the handbook first.`;
  return line.length <= 90 ? line : "Read the staff handbook before anything unlocks.";
}

/**
 * TRACK K: the email a person gets when the founder gives them staff access.
 * It names the exact access given, because "you are now staff" is not
 * something a person can check against what they were told. When a named
 * position was granted, it carries the position's job description and a link
 * to the full description in the console.
 */
export function staffAccessGranted(data: {
  name: string | null;
  scopeWords: string;
  position?: StaffPosition | null;
}): EmailMessage {
  const job = data.position ? JOB_DESCRIPTIONS[data.position] : null;
  const composed = compose({
    preheader:
      accessLine(data.scopeWords),
    blocks: [
      heading("You have Vallo staff access"),
      paragraph(`${hello(data.name)} The Vallo founder gave your account access to the staff console.`),
      rows([
        ...(job ? [{ label: "Position", value: job.title, strong: true }] : []),
        { label: "Access given", value: data.scopeWords, strong: !job },
        ...(job ? [{ label: "Reports to", value: job.reportsTo }] : []),
      ]),
      ...(job
        ? [
            paragraph(job.summary),
            paragraph("What you are responsible for:"),
            bullets(job.responsibilities),
            button("Read your full role description", appUrl("/admin/handbook/position")),
          ]
        : []),
      paragraph(
        "Nothing unlocks until you read and acknowledge the staff handbook. Every decision you make is recorded with your name.",
      ),
      button("Read the handbook", appUrl("/admin/handbook")),
      note("If you did not expect this, tell the founder and do not open the console."),
    ],
    footerLines: ["You are receiving this because your account was given staff access on Vallo."],
  });
  return {
    subject: job ? fitSubject("Staff access", job.title) : "You have Vallo staff access",
    preheader: composed.preheader,
    html: composed.html,
    text: composed.text,
  };
}
