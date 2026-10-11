#!/usr/bin/env node
/**
 * Runs the VC1 migration and its probe on PGlite (Postgres compiled to wasm),
 * over stand-ins of the live objects it depends on. A check that the SQL
 * compiles and the probe's assertions hold on a real Postgres engine before
 * the lead applies it; NOT a substitute for the probe on the live database.
 *
 *   VC_PGLITE_MODULE=/path/to/node_modules/@electric-sql/pglite/dist/index.js \
 *     node scripts/calls/pglite-probe.mjs
 *
 * PGlite is not a dependency of this repository (D46: the lockfile has owners);
 * install it anywhere outside the repo (`npm i @electric-sql/pglite@0.2.17`
 * in a scratch folder) and point VC_PGLITE_MODULE at it.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

export function vc1MigrationPath() {
  const pending = join(root, "supabase/migrations/pending/vc1_video_calls.sql");
  if (existsSync(pending)) return pending;
  const dir = join(root, "supabase/migrations");
  const applied = readdirSync(dir).find((f) => /^\d{14}_vc1_video_calls\.sql$/.test(f));
  if (!applied) throw new Error("VC1 migration not found");
  return join(dir, applied);
}

export function vc1ProbePath() {
  for (const p of ["supabase/tests/probes-pending/vc1-video-calls.sql", "supabase/tests/probes/vc1-video-calls.sql"]) {
    if (existsSync(join(root, p))) return join(root, p);
  }
  throw new Error("VC1 probe not found");
}

/** A PGlite database with the stand-ins and the VC1 migration applied. */
export async function vc1Database(modulePath) {
  const { PGlite } = await import(modulePath);
  const db = new PGlite();
  await db.exec(readFileSync(join(here, "fixtures/pglite-live-stubs.sql"), "utf8"));
  await db.exec(readFileSync(vc1MigrationPath(), "utf8"));
  return db;
}

async function main() {
  const modulePath = process.env.VC_PGLITE_MODULE;
  if (!modulePath) {
    console.error("Set VC_PGLITE_MODULE to PGlite's dist/index.js (see the header of this file).");
    process.exit(2);
  }
  const db = await vc1Database(modulePath);
  console.log("migration applied on PGlite");
  try {
    await db.exec(readFileSync(vc1MigrationPath(), "utf8"));
    console.log("migration re-applied cleanly (idempotent)");
  } catch (e) {
    console.log(`re-apply failed: ${e.message}`);
    process.exit(1);
  }
  try {
    await db.exec(`begin;\n${readFileSync(vc1ProbePath(), "utf8")}\nrollback;`);
    console.log("FAIL: the probe finished without raising");
    process.exit(1);
  } catch (e) {
    const ok = /^PROBE_OK vc1-video-calls\b/.test(e.message);
    console.log(ok ? `PASS: ${e.message}` : `FAIL: ${e.message}`);
    process.exit(ok ? 0 : 1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
