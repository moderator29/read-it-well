/**
 * The counterparty line, without the word the title already carries.
 *
 * `transferToUser` labels the two legs "Transfer to {name}" and "Transfer
 * from {name}", and the row's title already says "Transfer sent" or
 * "Transfer received". The render's line reads "To Tunde Adebayo", which is
 * the same fact said once. Anything else is shown exactly as written.
 */
export function counterpartyLine(text: string | undefined): string | undefined {
  if (!text) return text;
  const to = /^Transfer to\s+/i;
  const from = /^Transfer from\s+/i;
  if (to.test(text)) return `To ${text.replace(to, "")}`;
  if (from.test(text)) return `From ${text.replace(from, "")}`;
  return text;
}
