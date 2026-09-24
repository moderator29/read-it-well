import "server-only";

import { getDictionary, DEFAULT_LOCALE } from "@vallo/i18n";
import type { JobVerdict } from "../../bookings/lifecycle";
import { siteUrl } from "../../site";
import { summarise } from "../../store/readiness";
import { runStoreChecks } from "../../store/run";
import type { AdminClient } from "../rpc";

/**
 * V-52, THE NIGHTLY HALF: the same nine store checks the Store tab runs on
 * demand, run once a night against the production origin.
 *
 * The run itself is the audit row: `runCronJob` writes one `audit_log` entry
 * per run with these counts, which is what the operations desk reads. A red
 * check raises one risk alert naming which checks are red, so a store
 * readiness problem reaches the alert desk the morning it appears rather than
 * the afternoon the founder opens a submission. A check that could not run is
 * counted apart and never raises an alert on its own: an unreachable page is
 * the canary's business (V-01), not a store verdict.
 */
export async function storeReadiness(admin: AdminClient): Promise<JobVerdict> {
  const copy = getDictionary(DEFAULT_LOCALE).frontDoor.store;
  const run = await runStoreChecks(admin, siteUrl(), copy);
  const counts = summarise(run.checks);
  const red = run.checks.filter((check) => check.state === "fail").map((check) => check.key);
  const detail: Record<string, string | number | boolean | null> = {
    pass: counts.pass,
    fail: counts.fail,
    not_run: counts.unknown,
    origin: run.origin,
  };
  red.forEach((key, index) => {
    detail[`red_${index + 1}`] = key;
  });
  return {
    outcome: red.length > 0 ? "attention" : "ok",
    counts: { pass: counts.pass, fail: counts.fail, not_run: counts.unknown },
    detail,
    alert: red.length > 0 ? { kind: "store.readiness.red", severity: "warning", detail } : null,
  };
}
