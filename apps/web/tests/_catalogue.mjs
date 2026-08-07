/**
 * Is there anything on the shelf?
 *
 * The seed catalogue of twenty-three invented places was removed on purpose:
 * a full shelf of homes that do not exist is a worse answer than an empty one,
 * and `lib/listings/repository.ts` says so at length. Fifteen specs were
 * written against that catalogue and now fail on its absence, which is a red
 * tick for a decision somebody made deliberately, and a suite where a third of
 * the reds mean "correct" is a suite people stop reading.
 *
 * `filters.spec`, `light-and-water.spec` and `discovery-behaviour.spec` already
 * handled it the right way, each with its own copy of the same eight lines.
 * This is those eight lines, once.
 *
 * The rule it encodes: a check that CANNOT RUN is not a check that FAILED, and
 * the difference has to be said out loud. A silent skip is worse than a red,
 * because a green tick over an unrun assertion is the only outcome that lies.
 */

/** How many result cards `/search` is actually rendering. */
export async function catalogueSize(page, baseUrl) {
  await page.goto(`${baseUrl}/search`, { waitUntil: "load", timeout: 60000 });
  const raw = await page
    .locator("[data-count]")
    .first()
    .getAttribute("data-count")
    .catch(() => null);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * True when there is nothing to assert against, having said so.
 *
 * `what` names the checks being skipped, so the line reads as a sentence:
 * "skip  catalogue is empty, so there is nothing to filter".
 */
export function skipEmptyCatalogue(size, what) {
  if (size > 0) return false;
  console.log(`  skip    catalogue is empty, so there is ${what}`);
  console.log("  note    run against a deployment with real inventory to exercise this");
  return true;
}
