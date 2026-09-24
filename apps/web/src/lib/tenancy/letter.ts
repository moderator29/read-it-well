/**
 * V-85. THE CAUTION DEMAND LETTER, generated from the record and nothing else.
 *
 * Every sentence is filled from the caution obligation, its deductions and
 * returns: who owes, how much is still owed, the date it was due, the area of
 * the tenancy, and a date 30 days on by which to pay or give an itemised
 * statement. The only words the tenant writes are one optional paragraph,
 * marked as theirs. It claims no court form and gives no legal advice: it is
 * a dated demand a person can send and keep.
 *
 * It opens in the tenant's own mail app (`mailto:`), the one permitted exit,
 * with no address filled in: Vallo has no relay address for a lister, and
 * this letter never prints one it cannot stand behind.
 */
export const RESPOND_WITHIN_DAYS = 30;

export type LetterFacts = {
  tenantName: string | null;
  listerName: string | null;
  /** "Yaba, Lagos": the area, never the address. */
  area: string;
  period: { from: string; to: string };
  cautionPaid: string;
  returned: string;
  deducted: string;
  outstanding: string;
  dueOn: string;
  respondBy: string;
  /** Lines the tenant disputed, already formatted: "Kitchen: ₦20,000". */
  disputed: string[];
  /** The receipt code a reader can check at /r, when the tenant made one. */
  receiptCode: string | null;
  verifyUrl: string | null;
  /** Written today, as a date label. */
  today: string;
};

export function demandLetter(facts: LetterFacts, personal?: string | null): { subject: string; body: string } {
  const lister = facts.listerName?.trim() || "the lister";
  const tenant = facts.tenantName?.trim() || "The tenant";
  const lines: string[] = [
    facts.today,
    "",
    `To ${lister},`,
    "",
    `Caution deposit for the tenancy in ${facts.area}, ${facts.period.from} to ${facts.period.to}`,
    "",
    `I paid a caution deposit of ${facts.cautionPaid} through Vallo with the move-in total. It was due back to me by ${facts.dueOn}.`,
    `As recorded on Vallo, ${facts.returned} has been returned and ${facts.deducted} deducted by agreement. ${facts.outstanding} is still owed.`,
  ];
  if (facts.disputed.length > 0) {
    lines.push("", "I disputed these proposed deductions, and they are not agreed:");
    for (const line of facts.disputed) lines.push(`- ${line}`);
  }
  lines.push(
    "",
    `Please pay ${facts.outstanding} to my Vallo wallet from the tenancy file, or send me an itemised statement of any further deduction with the evidence for it, by ${facts.respondBy}.`,
  );
  if (facts.receiptCode && facts.verifyUrl) {
    lines.push("", `The payment can be checked with receipt code ${facts.receiptCode} at ${facts.verifyUrl}.`);
  }
  const own = personal?.trim();
  if (own) lines.push("", "In my own words:", own.slice(0, 1500));
  lines.push("", "Yours faithfully,", tenant);
  return {
    subject: `Caution deposit owed: ${facts.outstanding}, due ${facts.dueOn}`,
    body: lines.join("\n"),
  };
}

/** A `mailto:` with no recipient: the tenant chooses who it goes to. */
export function mailtoHref(letter: { subject: string; body: string }): string {
  return `mailto:?subject=${encodeURIComponent(letter.subject)}&body=${encodeURIComponent(letter.body)}`;
}
