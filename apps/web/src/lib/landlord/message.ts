/**
 * WHAT THE LANDLORD IS SENT, AND HOW THEIR REPLY IS READ. Pure, client-safe.
 *
 * ---------------------------------------------------------------------------
 * THE MESSAGE. One question, the four character reply code printed beside
 * every option, and the link to the same question in Vallo's own chrome. The
 * place is "2 bedroom apartment in Ikeja GRA", built by the database from the
 * area and never the address, so nothing a landlord forwards identifies a
 * door. The agent is named by their public display name only, because the
 * landlord needs to know which agent we mean and the agent's name is already
 * on the listing.
 *
 * The naira sign pushes an SMS into the UCS-2 alphabet (70 characters a
 * segment rather than 160), so a rent message is two or three segments. That
 * is a cost the aggregator quotes per segment, and it is accepted rather than
 * spelling money some second way: the platform has exactly one way to write
 * naira, `formatMoney`, and a landlord comparing our figure with the one in
 * their head should see it written the way every other Vallo surface writes it.
 *
 * ---------------------------------------------------------------------------
 * THE TOKEN NEVER REACHES STORAGE. `redactToken` replaces it before the body
 * is written to `principal_messages`, and that table's check constraint
 * refuses a body that still carries one. The raw token exists in the database
 * only as sha256, in this process only for the length of one send, and in the
 * landlord's phone.
 *
 * ---------------------------------------------------------------------------
 * THE REPLY. Landlords type what they type: "1", "1 K7QX", "K7QX 1", "1k7qx",
 * "2." and "please stop". `parseReply` accepts all of them and nothing looser:
 * a digit from 1 to 3 and an optional four character code from the reply
 * alphabet, in either order; or ANY text containing STOP, UNSUBSCRIBE, QUIT,
 * CANCEL or END as a word, which is a stop whatever else it says. Anything else is not guessed at, because
 * a misread "let" takes a real listing down.
 */

/** The reply-code alphabet, the same one `landlord_line_issue` draws from. */
export const REPLY_CODE_ALPHABET = "ACDEFHJKMNPRTUVWXY3479";

/** The path of the reply page for a token. The page is a public door. */
export function replyPath(token: string): string {
  return `/landlord/${token}`;
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

export type VacancyTemplates = { vacancy: string; vacancyAgent: string };
export type RentTemplates = { rent: string; rentAgent: string };

export function composeVacancyMessage(
  copy: VacancyTemplates,
  input: { place: string; agent: string | null; code: string; link: string },
): string {
  const agentPart = input.agent ? fillTemplate(copy.vacancyAgent, { agent: input.agent }) : "";
  return fillTemplate(copy.vacancy, {
    place: input.place,
    agentPart,
    code: input.code,
    link: input.link,
  });
}

export function composeRentMessage(
  copy: RentTemplates,
  input: { place: string; agent: string | null; total: string; code: string; link: string },
): string {
  const agentPart = input.agent ? fillTemplate(copy.rentAgent, { agent: input.agent }) : "";
  return fillTemplate(copy.rent, {
    place: input.place,
    agentPart,
    total: input.total,
    code: input.code,
    link: input.link,
  });
}

/** The body as it may be stored: every reply-page token replaced. */
export function redactToken(body: string): string {
  return body.replace(/\/landlord\/[A-Za-z0-9_-]{16,}/g, "/landlord/[link]");
}

export type ParsedReply =
  | { kind: "answer"; digit: 1 | 2 | 3; code: string | null }
  | { kind: "stop" };

/**
 * Read an inbound SMS or WhatsApp reply, or null when it is not one we can
 * read with certainty.
 */
export function parseReply(text: string): ParsedReply | null {
  /* A STOP anywhere in the text is a stop, and it wins over any digit beside
     it: "2 stop", "Please stop texting me" and "STOP." are all withdrawals of
     consent, and misreading one as an answer would keep messaging somebody who
     asked us not to. Checked before any length limit for the same reason. */
  if (/\b(STOP|STOPALL|UNSUBSCRIBE|QUIT|CANCEL|END)\b/i.test(text)) return { kind: "stop" };
  const cleaned = text.trim().toUpperCase().replace(/[.,!]+$/g, "");
  if (cleaned.length === 0 || cleaned.length > 40) return null;

  const code = `[${REPLY_CODE_ALPHABET}]{4}`;
  const patterns = [
    new RegExp(`^([123])$`),
    new RegExp(`^([123])\\s*(${code})$`),
    new RegExp(`^(${code})\\s*([123])$`),
  ];
  for (const [index, pattern] of patterns.entries()) {
    const match = cleaned.match(pattern);
    if (!match) continue;
    if (index === 0) return { kind: "answer", digit: Number(match[1]) as 1 | 2 | 3, code: null };
    if (index === 1) return { kind: "answer", digit: Number(match[1]) as 1 | 2 | 3, code: match[2]! };
    return { kind: "answer", digit: Number(match[2]) as 1 | 2 | 3, code: match[1]! };
  }
  return null;
}

/** The answer a reply-page button sends, by the question's purpose. */
export type VacancyAnswer = "available" | "let" | "not_instructed";
export type RentAnswer = "confirmed" | "disputed";
export type PrincipalAnswer = VacancyAnswer | RentAnswer;

export function isAnswerFor(purpose: "vacancy" | "rent", answer: string): answer is PrincipalAnswer {
  return purpose === "vacancy"
    ? answer === "available" || answer === "let" || answer === "not_instructed"
    : answer === "confirmed" || answer === "disputed";
}
