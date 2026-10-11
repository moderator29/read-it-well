#!/usr/bin/env node
/**
 * Does the VC1 probe actually catch what it claims to? Re-introduces one
 * defect at a time into the migration text, applies it on PGlite over the
 * stand-ins, runs the probe, and expects PROBE_FAIL every time.
 *
 *   VC_PGLITE_MODULE=/path/to/@electric-sql/pglite/dist/index.js node scripts/calls/pglite-mutations.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vc1MigrationPath, vc1ProbePath } from "./pglite-probe.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const modulePath = process.env.VC_PGLITE_MODULE;
if (!modulePath) {
  console.error("Set VC_PGLITE_MODULE (see scripts/calls/pglite-probe.mjs).");
  process.exit(2);
}
const { PGlite } = await import(modulePath);
const stub = readFileSync(join(here, "fixtures/pglite-live-stubs.sql"), "utf8");
const migration = readFileSync(vc1MigrationPath(), "utf8");
const probe = readFileSync(vc1ProbePath(), "utf8");

const MUTATIONS = {
  "members can insert and update calls": (s) => `${s}\ngrant insert, update on public.calls to authenticated;\n`,
  "the call-marker policy lets anything through": (s) => s.replace("with check (call_id is null);", "with check (true);"),
  "cold calls allowed": (s) => s.replace("raise exception 'call:not_engaged' using errcode = 'P0001';", "null;"),
  "webhooks applied twice": (s) =>
    s.replace(
      "on conflict (provider, event_id) do nothing\n  returning true into inserted;",
      "on conflict (provider, event_id) do update set received_at = now()\n  returning true into inserted;",
    ),
  "a drop ends the call": (s) =>
    s.replace(
      "perform private.call_transition(p_call, 'INTERRUPTED', null, p_source, null,",
      "perform private.call_transition(p_call, 'ENDED', null, p_source, null,",
    ),
  "the caller can answer their own call": (s) =>
    s.replace(
      "if p.role not in ('CALLEE', 'SUBJECT') then\n    raise exception 'call:not_yours_to_answer' using errcode = '42501';\n  end if;\n  c := private.call_apply_timeouts(p_call);\n  -- A second tap",
      "c := private.call_apply_timeouts(p_call);\n  -- A second tap",
    ),
  "the subject can read staff review rows": (s) => s.replace("using (private.call_review_staff_can(id));", "using (true);"),
  "a review call rings without consent": (s) =>
    s.replace("raise exception 'review:not_accepted' using errcode = 'P0001', detail = r.status;", "null;"),
};

let survived = 0;
for (const [name, mutate] of Object.entries(MUTATIONS)) {
  const mutant = mutate(migration);
  if (mutant === migration) {
    console.log(`NOT APPLIED  ${name} (the pattern moved; update this file)`);
    survived += 1;
    continue;
  }
  const db = new PGlite();
  await db.exec(stub);
  await db.exec(mutant);
  let line;
  try {
    await db.exec(`begin;\n${probe}\nrollback;`);
    line = "finished without raising";
  } catch (e) {
    line = e.message;
  }
  const caught = !/^PROBE_OK/.test(line);
  if (!caught) survived += 1;
  console.log(`${caught ? "caught      " : "SURVIVED    "} ${name}: ${line.slice(0, 100)}`);
  await db.close();
}
process.exit(survived === 0 ? 0 : 1);
