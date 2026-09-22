import { formatDate, formatMoney } from "@vallo/i18n";

import type { HeldPaymentEvidence } from "@/lib/escrow/queries";

/**
 * Everything filed on a dispute, both sides of it, in the order it was filed.
 *
 * BOTH PARTIES SEE THE WHOLE FILE. A dispute where one side cannot see what
 * has been filed against them is not a process, and a surprise at the ruling
 * is how an operator ends up arguing with somebody who feels ambushed.
 *
 * A ROW IS A FILE OR A FACT AND NEVER AN OPINION. A fact is one of thirteen
 * closed values that either happened or did not, with its date or its amount
 * where one applies. A file carries its name and a caption capped at two
 * hundred characters that asks what the file SHOWS.
 *
 * WHOSE IT IS IS SAID IN WORDS as well as by the stripe down the side, so the
 * stripe is a second signal rather than the only one.
 */

/** The thirteen facts, in the reader's words rather than in the enum's. */
const FACT_LINE: Record<string, string> = {
  viewing_attended: "The viewing happened",
  viewing_missed: "The viewing did not happen",
  keys_received: "The keys were handed over",
  keys_not_received: "The keys were not handed over",
  agreement_signed: "An agreement was signed",
  agreement_not_signed: "No agreement was signed",
  service_delivered: "The work was done",
  service_not_delivered: "The work was not done",
  property_matched_listing: "The property matched the listing",
  property_differed_from_listing: "The property was not what the listing said",
  contacted_on: "Got in touch",
  no_reply_since: "No reply since",
  amount_agreed: "The amount agreed",
};

function describe(item: HeldPaymentEvidence): string {
  if (item.kind === "file") {
    return item.caption ? `${item.fileName}: ${item.caption}` : (item.fileName ?? "A file");
  }
  const line = FACT_LINE[item.fact ?? ""] ?? "A fact";
  if (item.happenedOn) return `${line} on ${formatDate(new Date(`${item.happenedOn}T12:00:00Z`))}`;
  if (typeof item.amountMinor === "number") return `${line}: ${formatMoney(item.amountMinor)}`;
  return line;
}

export function EvidenceList({
  evidence,
}: {
  evidence: readonly HeldPaymentEvidence[];
}): React.ReactElement {
  if (evidence.length === 0) {
    return (
      <p className="nf-esc-line">
        Nothing has been filed yet. Add a receipt, a photograph, a screenshot of your messages, or
        the dates things happened on.
      </p>
    );
  }

  return (
    <div className="nf-esc-evidence">
      {evidence.map((item) => (
        <div className="nf-esc-filed" key={item.id} data-mine={item.mine ? "true" : "false"}>
          <span className="nf-esc-filed-who">
            {item.mine ? "Filed by you" : "Filed by the other person"}
          </span>
          <span className="nf-esc-filed-what">{describe(item)}</span>
        </div>
      ))}
    </div>
  );
}
