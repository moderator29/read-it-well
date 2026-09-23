import { factSentence } from "@/lib/escrow/copy";
import type { HeldPaymentEvidence } from "@/lib/escrow/queries";
import { Panel } from "@/components/ui/Panel";

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

/**
 * What one filed row says, in a sentence.
 *
 * THE THIRTEEN FACTS ARE NOT RESTATED HERE. They used to be, as a `FACT_LINE`
 * map in this file, which made three copies of one closed list: the enum in
 * the database, the array the server action validates against, and this. The
 * list lives in `copy.ts` now, beside every other sentence this feature says.
 *
 * A FILE IS DRAWN AS ITS NAME AND WHAT IT SHOWS, never as the caption alone: a
 * caption is a claim about a file and a reader needs to be able to open the
 * file and disagree with it.
 */
function describe(item: HeldPaymentEvidence): string {
  if (item.kind === "file") {
    return item.caption ? `${item.fileName}: ${item.caption}` : (item.fileName ?? "A file");
  }
  return factSentence(item);
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
        <Panel as="div" variant="card" className="nf-esc-filed" key={item.id} data-mine={item.mine ? "true" : "false"}>
          <span className="nf-esc-filed-who">
            {item.mine ? "Filed by you" : "Filed by the other person"}
          </span>
          <span className="nf-esc-filed-what">{describe(item)}</span>
          {item.kind === "file" ? (
            item.href ? (
              /*
                A LINK OUT, and deliberately not a preview. A signed URL on a
                private bucket expires, and an <img> that has expired is a
                broken picture where a person expects evidence. A named link
                that opens is the honest control, and it works for a PDF and a
                photograph alike.
              */
              <a
                className="nf-esc-filed-open"
                href={item.href}
                target="_blank"
                rel="noreferrer"
              >
                Open this file
              </a>
            ) : (
              /*
                NULL IS NOT ABSENT. The row is still drawn with its name; only
                the link is missing. Dropping the row instead would tell one
                party the other had filed nothing.
              */
              <span className="nf-esc-filed-open" aria-live="polite">
                This file could not be opened just now. Refresh and try again.
              </span>
            )
          ) : null}
        </Panel>
      ))}
    </div>
  );
}
