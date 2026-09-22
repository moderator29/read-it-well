import { notFound } from "next/navigation";

/**
 * /crypto GOES DARK FOR VERSION ONE, AND IT IS A `notFound()` RATHER THAN AN
 * ENVIRONMENT GATE. THIS IS DEFERRED, NOT CANCELLED.
 *
 * The ruling, from HANDOFF 08 section 5.2: a token price table inside a
 * property application invites the content aggregator refusal on Apple and
 * the Cryptocurrency Exchanges and Software Wallets declarations on both
 * stores, for zero launch value.
 *
 * WHY NOT AN ENVIRONMENT GATE, WHICH WOULD HAVE BEEN ONE LINE LESS. An
 * environment gate is a route that EXISTS and is switched off. A reviewer who
 * finds it asks what it is, and the answer is a crypto surface, which is the
 * conversation this ruling exists to avoid having. `notFound()` is the route
 * not existing.
 *
 * B6 IN `HANDOFF_05` IS DEFERRED, NOT CANCELLED. The proxy work stops; it is
 * not deleted, and neither is anything under `components/app/crypto/`, the
 * Yellow Card client, `/api/crypto/*` or the preview surfaces under
 * `(dev)/preview/e/`. All of it still builds and still has its tests. Turning
 * this back on for v1.1 is deleting this file's body and restoring the two
 * lines below, and nobody should read a dark route as permission to remove
 * the work behind it.
 *
 * THE TWO LINES THAT COME BACK when the founder rules that crypto ships:
 *   the original body is in git at `a315170^`, and the route was
 *   `<CryptoMarket locale={locale} copy={t.crypto} cryptoEnabled={...} />`
 *   under a `PageHeader` with `t.crypto.title`.
 */
export default function CryptoPage() {
  notFound();
}
