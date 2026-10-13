import type { Dictionary, Locale } from "@vallo/i18n/core";
import { formatDate } from "@vallo/i18n/core";
import { UiIcon } from "@/design-system/icons/UiIcon";
import type { ListingStatus } from "@/lib/agent/listings-queries";
import { fill } from "../_copy";
import "@/app/css/catalogue.css";

type WizardCopy = Dictionary["agentListings"];

/**
 * SENT FOR REVIEW, AS A CHAIN UNDER THE CARD (round 5, a lister publishing).
 *
 * This used to be a page of its own that replaced the wizard: a 3D calendar,
 * a verdict, a panel about the listing ID and three promises, with a success
 * sheet opened over it and a ring of light going out from the object twice.
 * It celebrated a listing nobody had looked at yet, and it took the thing the
 * lister had just made off the screen to do it.
 *
 * Now the wizard's last step keeps the member card where it was, and this is
 * what arrives beneath it: three links of one honest chain (reference 7118,
 * and CRAFT-PRINCIPLES moment 6), each in the workspace's own status words.
 *
 *   Submitted     done, with the date the server wrote (`submitted_at`)
 *   Under review  the next thing, with how long it takes and that the lister
 *                 hears either way; "happening now" only once the server says
 *                 a reviewer has it (UNDER_REVIEW)
 *   Live          not yet, and what arrives with it: a notification and the
 *                 listing ID, which is minted at publish and so is not printed
 *                 here (rule 15: no figure the database cannot produce)
 *
 * A link ticks only when it has happened. The state is said in words beside
 * each node, never by colour alone. The payoff is not here: it belongs to the
 * day the listing is live (`lib/agent/lister-live.ts`).
 */
export function ListingSentForReview({
  copy,
  reference,
  lister,
  status = "SUBMITTED",
  submittedAt = null,
  locale = "en",
}: {
  copy: WizardCopy;
  reference: Dictionary["listingReference"];
  lister?: Dictionary["experienceLister"] | undefined;
  /** The server's status for the listing: SUBMITTED or UNDER_REVIEW. */
  status?: ListingStatus;
  /** When the review team received it, as stored. */
  submittedAt?: string | null;
  locale?: Locale;
}) {
  const words = copy.workspace.status;
  const received = submittedAt ? new Date(submittedAt) : null;
  const date = received && Number.isFinite(received.getTime()) ? formatDate(received, locale) : null;
  const reviewing = status === "UNDER_REVIEW";
  const rows = [
    {
      key: "sent",
      state: "done" as const,
      name: words.SUBMITTED,
      sub: date ? (lister ? fill(lister.publish.sentOn, { date }) : date) : null,
    },
    { key: "review", state: reviewing ? ("now" as const) : ("next" as const), name: words.UNDER_REVIEW, sub: copy.submit.note },
    { key: "live", state: "next" as const, name: words.PUBLISHED, sub: reference.issuedWhenLive },
  ];
  const said = { done: lister?.publish.stateDone, now: lister?.publish.stateNow, next: lister?.publish.stateNext };

  return (
    <section className="nf-lw-chain mt-heading" aria-labelledby="listing-chain-title" data-testid="listing-chain">
      <h2 id="listing-chain-title" className="nf-label">
        {lister?.publish.chainTitle ?? copy.drawn.done.nextTitle}
      </h2>
      <ol className="nf-lw-chain__list">
        {rows.map((row) => (
          <li key={row.key} className="nf-lw-chain__row" data-state={row.state}>
            <span className="nf-lw-chain__node" aria-hidden="true">
              {row.state === "done" ? <UiIcon name="check" size={12} /> : null}
            </span>
            <span className="nf-lw-chain__text">
              <span className="nf-lw-chain__name">
                {row.name}
                {said[row.state] ? <span className="sr-only">, {said[row.state]}</span> : null}
              </span>
              {row.sub ? <span className="nf-lw-chain__sub">{row.sub}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
