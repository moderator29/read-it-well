import "server-only";

import { PURGE_BATCH_LIMIT } from "../../account-deletion/constants";
import { runAccountPurges } from "../../account-deletion/purge";
import { purgeDeps } from "../../account-deletion/service";
import { spreadIds, type JobVerdict } from "../../bookings/lifecycle";
import type { AdminClient } from "../rpc";

/**
 * The scheduled purge: the end of the thirty day grace window.
 *
 * It takes every deletion request whose clock has run out, destroys what the
 * person asked to have destroyed, pseudonymises what the law requires us to
 * keep, empties their folder in all nine storage buckets, and marks the
 * request done. It runs on the same harness as the hold sweep, so it inherits
 * the bearer guard, the 503 when the service key is missing, the report and
 * the alert, and a run that quietly stops being scheduled is noticed.
 *
 * IDEMPOTENT. A request already purged answers `already` and changes nothing,
 * so a double fire, a retried invocation and a run that died halfway all end
 * in the same state. A request that could not be finished is left OPEN with
 * its reason recorded, so the next run picks it up rather than a person
 * believing a deletion happened that did not.
 *
 * ATTENTION, NOT FAILURE, WHEN A PURGE RETRIES. The run itself worked; one
 * account did not finish. That is the alert the desk needs, and it carries
 * request ids, which are opaque uuids and not people.
 */
export async function accountPurge(admin: AdminClient): Promise<JobVerdict> {
  const result = await runAccountPurges(purgeDeps(admin), PURGE_BATCH_LIMIT);

  const counts = { due: result.due, purged: result.purged, retried: result.retried };
  const detail = { due: result.due, purged: result.purged, retried: result.retried };

  if (result.retried === 0) return { outcome: "ok", counts, detail, alert: null };

  return {
    outcome: "attention",
    counts,
    detail,
    alert: {
      // A person asked to be deleted and has not been. This is a data
      // protection obligation with a clock on it, so it is critical.
      kind: "cron.account_purge.unfinished",
      severity: "critical",
      detail: { retried: result.retried, ...spreadIds("request", result.failures) },
    },
  };
}
