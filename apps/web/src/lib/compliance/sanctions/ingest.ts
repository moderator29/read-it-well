import "server-only";

import { createHash } from "node:crypto";
import { parseList } from "./parse";
import type { ListSource } from "./sources";

/**
 * LOADING A LIST VERSION. SCUML items 8 and 9.
 *
 * Service role only. A file is identified by its SHA-256: the same file again
 * changes nothing. A new file becomes a new version, written INACTIVE with its
 * entries. Activation (which the database answers by queueing everyone to be
 * screened again, item 9) happens here only for a file fetched from its URL
 * that is not suspiciously short. Otherwise the version waits for a staff
 * member on the desk (`sanctions_list_activate`, item 19):
 *   - an UPLOAD always waits, and the person who uploaded it cannot activate
 *     it;
 *   - a file with fewer than 90% of the entries of the version in force
 *     waits, because a truncated or partial list would clear everyone it
 *     dropped.
 * A file that does not parse as its list (including one without its closing
 * tag) is refused and nothing is written.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = { from: (table: string) => any };

export type IngestResult =
  | { state: "loaded"; versionId: string; entries: number }
  | { state: "waiting"; versionId: string; entries: number; why: "upload" | "shrunk" | "unverified" }
  | { state: "same" }
  | { state: "refused"; reason: string }
  | { state: "failed"; reason: string };

const CHUNK = 500;
export const SHRINK_FLOOR = 0.9;

/**
 * Does a new version activate by itself? Only from a URL, only when the file
 * proves it is whole, and only when it is not short.
 */
export function activatesItself(
  origin: "url" | "upload",
  entries: number,
  inForce: number | null,
  complete = true,
): "yes" | "upload" | "shrunk" | "unverified" {
  if (origin === "upload") return "upload";
  if (!complete) return "unverified";
  if (inForce !== null && entries < SHRINK_FLOOR * inForce) return "shrunk";
  return "yes";
}

export async function ingestList(admin: Admin, source: ListSource, loadedBy: string | null = null): Promise<IngestResult> {
  const text = await source.read();
  if (text === null) return { state: "failed", reason: "unreadable" };
  const parsed = parseList(source.source, text);
  if (!parsed.ok) return { state: "refused", reason: parsed.reason };
  const sha256 = createHash("sha256").update(text).digest("hex");

  const { data: existing, error: readError } = await admin
    .from("sanctions_list_versions")
    .select("id, activated_at")
    .eq("source", source.source)
    .eq("sha256", sha256)
    .maybeSingle();
  if (readError) return { state: "failed", reason: "read" };
  if (existing?.activated_at) return { state: "same" };

  let versionId: string | undefined = existing?.id;
  if (!versionId) {
    const { data: made, error } = await admin
      .from("sanctions_list_versions")
      .insert({ source: source.source, sha256, origin: source.origin, loaded_by: loadedBy })
      .select("id")
      .single();
    if (error || !made) return { state: "failed", reason: "version" };
    versionId = made.id as string;
  }

  for (let i = 0; i < parsed.entries.length; i += CHUNK) {
    const rows = parsed.entries.slice(i, i + CHUNK).map((e) => ({
      version_id: versionId,
      source: source.source,
      reference: e.reference,
      kind: e.kind,
      primary_name: e.primaryName,
      aliases: e.aliases,
      names_normalised: e.namesNormalised,
      dates_of_birth: e.datesOfBirth,
      nationalities: e.nationalities,
      listed_on: e.listedOn,
    }));
    const { error } = await admin.from("sanctions_entries").upsert(rows, { onConflict: "version_id,reference", ignoreDuplicates: true });
    if (error) return { state: "failed", reason: "entries" };
  }

  const { data: inForceRows, error: inForceError } = await admin
    .from("sanctions_list_versions")
    .select("entry_count")
    .eq("source", source.source)
    .not("activated_at", "is", null)
    .order("activated_at", { ascending: false })
    .limit(1);
  if (inForceError) return { state: "failed", reason: "read" };
  const inForce = Array.isArray(inForceRows) && inForceRows[0] ? Number(inForceRows[0].entry_count) : null;
  const entries = parsed.entries.length;
  const verdict = activatesItself(source.origin, entries, inForce, parsed.complete);

  const { error: activateError } = await admin
    .from("sanctions_list_versions")
    .update({
      entry_count: entries,
      previous_entries: inForce,
      /* An incomplete file (no END row) can never be activated: staff load a whole one. */
      complete: parsed.complete,
      ...(verdict === "yes" ? { activated_at: new Date().toISOString() } : {}),
    })
    .eq("id", versionId)
    .is("activated_at", null);
  if (activateError) return { state: "failed", reason: "activate" };
  return verdict === "yes" ? { state: "loaded", versionId, entries } : { state: "waiting", versionId, entries, why: verdict };
}
