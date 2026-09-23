import Link from "next/link";

/**
 * THE PRICE CHECK HARNESS.
 *
 * Real components, fixture props, so nine refusal screens that the live estate
 * can only produce ONE of today can all be seen and photographed. On this
 * project 64 of 64 listings are examples, so a real `/price` refuses with
 * `demo_only` every single time: the other eight states are unreachable
 * without either supply we do not have or a database we are not allowed to
 * write to.
 *
 * It proves the LOOK and never the ONE LAW. Nothing here goes near the gate or
 * the funnel table: the gate is proved by
 * `scripts/probes/price_check_stage_one.sql` against the live database, and
 * the decision that picks the refusal is proved by `lib/price-check/gate.test.ts`.
 *
 * THE SHARE PAGE IS THE ONE EXCEPTION AND IT SAYS SO ON ITSELF. Its button
 * calls the real server action and mints a real row, because a share whose
 * control is stubbed proves a layout and nothing else, and the thing worth
 * proving is that the whole path works and that what comes out of it carries
 * no address. The rule itself is proved against the live database by
 * `scripts/probes/price_check_share_cannot_carry_an_address.sql`.
 */
const PAGES = [
  ["refusals", "All nine refusal states, each with its copy and its next action"],
  ["answered", "An answered range, the basis line, the confidence row and the disclaimer"],
  ["area", "The area report and the neighbourhood power and water panel"],
  ["share", "The share control, the sheet, the card and the state where there is nothing to share"],
];

export default function PreviewPriceIndex() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Price Check</h1>
      <p className="mt-inline nf-body text-[var(--nf-content-secondary)]">
        The refusal is the feature. Every per-property check on this project refuses today,
        because all 64 listings are examples and the comparables predicate excludes them.
      </p>
      <ul className="mt-md flex flex-col gap-xs">
        {PAGES.map(([slug, note]) => (
          <li key={slug}>
            <Link className="nf-link" href={`/preview/price/${slug}`}>
              {slug}
            </Link>
            <span className="ml-inline text-[var(--nf-content-muted)]">{note}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
