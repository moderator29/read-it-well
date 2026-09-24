import "server-only";

import type { JobVerdict } from "../../bookings/lifecycle";
import { ingestList, type IngestResult } from "../../compliance/sanctions/ingest";
import { drainScreenQueue, type DrainCounts } from "../../compliance/sanctions/screen";
import { configuredSources, type ListSource } from "../../compliance/sanctions/sources";
import type { AdminClient } from "../rpc";

/**
 * THE SANCTIONS JOBS. SCUML items 8 and 9.
 *
 * `sanctions-lists`, daily: reads each list from its configured URL
 * (`SANCTIONS_UN_URL`, `SANCTIONS_NG_URL`) and loads it when the file
 * changed; a new version re-screens everyone in the database. With no URL
 * configured it is a clean no-op that says so; the lists are then loaded by
 * staff on the desk.
 *
 * `sanctions-screen`, every fifteen minutes: screens what the triggers
 * queued. Raises an alert (counts only, never a name) when a run raised new
 * matches, so somebody opens the desk, and when it could not read the lists.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export function listsVerdict(results: { source: string; result: IngestResult }[]): JobVerdict {
  const counts = {
    sources: results.length,
    loaded: results.filter((r) => r.result.state === "loaded").length,
    same: results.filter((r) => r.result.state === "same").length,
    refused: results.filter((r) => r.result.state === "refused").length,
    failed: results.filter((r) => r.result.state === "failed").length,
  };
  const detail = { configured: results.length > 0 };
  if (counts.failed + counts.refused > 0) {
    const broken = results.filter((r) => r.result.state === "failed" || r.result.state === "refused").map((r) => r.source).join(",");
    return {
      outcome: "attention",
      counts,
      detail,
      alert: { kind: "sanctions.list_refresh_failed", severity: "warning", detail: { sources: broken, scuml_item: 9 } },
    };
  }
  return { outcome: "ok", counts, detail, alert: null };
}

export async function sanctionsLists(admin: AdminClient, sources: ListSource[] = configuredSources()): Promise<JobVerdict> {
  const results: { source: string; result: IngestResult }[] = [];
  for (const source of sources) results.push({ source: source.source, result: await ingestList(admin as Loose, source) });
  return listsVerdict(results);
}

export function screenVerdict(counts: DrainCounts): JobVerdict {
  const { listsUnreadable, ...numbers } = counts;
  if (listsUnreadable) {
    return {
      outcome: "attention",
      counts: numbers,
      detail: { listsUnreadable },
      alert: { kind: "sanctions.lists_unreadable", severity: "critical", detail: { scuml_item: 8 } },
    };
  }
  if (counts.hits > 0) {
    return {
      outcome: "attention",
      counts: numbers,
      detail: {},
      alert: { kind: "sanctions.hits_raised", severity: "warning", detail: { hits: counts.hits, exact: counts.exact, scuml_item: 8 } },
    };
  }
  if (counts.failed > 0) {
    return {
      outcome: "attention",
      counts: numbers,
      detail: {},
      alert: { kind: "sanctions.screen_failed", severity: "warning", detail: { failed: counts.failed, scuml_item: 8 } },
    };
  }
  return { outcome: "ok", counts: numbers, detail: {}, alert: null };
}

export async function sanctionsScreen(admin: AdminClient): Promise<JobVerdict> {
  return screenVerdict(await drainScreenQueue(admin as Loose));
}
