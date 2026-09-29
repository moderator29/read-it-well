#!/usr/bin/env node
/**
 * THE BROWSER SPEC RUNNER, WITH A SMOKE TIER. V-51.
 *
 * `apps/web/tests/` holds 88 browser specs, each a plain Node script that
 * drives Chromium against `BASE_URL` and exits non-zero on a failure. Nothing
 * ran them: they ran when somebody remembered, which is how specs rot. This
 * runs them, in three tiers:
 *
 *   smoke   ten specs covering the surfaces a broken deploy hurts first: the
 *           sign-in wall, error copy, the PWA and offline shell, Save-Data,
 *           fonts, checkout, the wallet, a listing, messages, and the admin
 *           console. Meant to block a merge, once CI exists again.
 *   full    every `*.spec.mjs`. Meant for a nightly run on `main`.
 *   prod    the specs that assert PRODUCTION-BUILD properties (the CSP without
 *           'unsafe-eval', font preloads, Save-Data page weight, the PWA
 *           manifest and theme-color metas). `next dev` differs from a build
 *           in exactly those respects, so these only mean something against
 *           `next build && next start` or a deployment:
 *
 *             cd apps/web && npx next build && npx next start -p 3230
 *             BASE_URL=http://localhost:3230 node apps/web/tests/run.mjs --tier prod
 *
 * WHICH SERVER IS THIS. `--server dev|prod|auto` (default auto). Auto reads
 * the landing page and calls it dev when the Next dev tools are in it. Against
 * a dev server the PROD specs are not run in any tier: they are listed as
 * "prod" (deferred to the prod tier), never as passes, and `--tier prod`
 * refuses to start.
 *
 * SKIPS. A spec prints `  SKIP    <reason>` for a section it could not run for
 * a named missing prerequisite (QA credentials, the preview harness closed),
 * and exits 77 when every section was skipped. The runner reports those as
 * "skip" with every reason, never as a pass, and does not count them as
 * failures. See `_gate.mjs`.
 *
 *     BASE_URL=http://localhost:3060 node apps/web/tests/run.mjs --tier smoke
 *     BASE_URL=https://<preview>.vercel.app node apps/web/tests/run.mjs --tier full
 *     node apps/web/tests/run.mjs --list --tier smoke
 *
 * Each spec runs as its own process (they call `process.exit` themselves),
 * one at a time (several drive a signed-in session and would fight over it),
 * with a per-spec timeout so one hung browser cannot hold the whole run. The
 * summary names every failure with the last lines it printed, and the exit
 * code is the number of failed specs, capped at 100.
 *
 * WHAT IT DOES NOT DO. It does not start a server, wait for a Vercel preview,
 * or install a browser. Those belong to the CI workflow, which is the audit
 * session's pipeline (`.github/`); the change to it is proposed in the V-51
 * report rather than made here. It sets PLAYWRIGHT_BROWSERS_PATH to
 * `/opt/pw-browsers` when that directory exists and nothing else was set,
 * because that is where this environment keeps Chromium.
 */

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const SMOKE = [
  "gate",
  "error-copy",
  "pwa",
  "save-data",
  "fonts",
  "checkout",
  "wallet",
  "listing-detail",
  "messages",
  "admin-console",
];

/** Production-build properties; meaningless against `next dev`. */
export const PROD = ["csp", "fonts", "pwa", "save-data"];

export const SKIP_EXIT = 77;

/**
 * Specs that sweep dozens of routes at several widths and need longer than
 * the default per-spec timeout on a dev server that compiles as it goes. The
 * runner uses the larger of this and `--timeout`.
 */
export const SLOW = {
  truncation: 720,
  "polish-overlays-copy-status": 720,
  "icons-and-targets": 600,
  "money-and-numbers": 480,
  csp: 480,
};

export function specsFor(tier, available) {
  if (tier === "full") return [...available].sort();
  if (tier === "prod") {
    const missing = PROD.filter((name) => !available.includes(name));
    if (missing.length > 0) throw new Error(`prod tier names specs that do not exist: ${missing.join(", ")}`);
    return PROD;
  }
  const missing = SMOKE.filter((name) => !available.includes(name));
  if (missing.length > 0) throw new Error(`smoke tier names specs that do not exist: ${missing.join(", ")}`);
  return SMOKE;
}

function arg(argv, flag, fallback) {
  const at = argv.indexOf(flag);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
}

function runOne(name, env, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    /* Its own process group, so a timeout takes the spec's Chromium down
       with it; killing only the Node parent leaves the browser holding the
       pipes open and the run waits for it anyway. */
    const child = spawn(process.execPath, [join(HERE, `${name}.spec.mjs`)], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let tail = "";
    const skips = [];
    let partial = "";
    const keep = (chunk) => {
      tail = (tail + chunk.toString()).split("\n").slice(-12).join("\n");
      const lines = (partial + chunk.toString()).split("\n");
      partial = lines.pop() ?? "";
      for (const line of lines) {
        const m = /^\s*SKIP\s+(.*)$/.exec(line);
        if (m) skips.push(m[1].trim());
      }
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(() => {
      tail += `\n[run] timed out after ${Math.round(timeoutMs / 1000)}s`;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const m = /^\s*SKIP\s+(.*)$/.exec(partial);
      if (m) skips.push(m[1].trim());
      resolve({
        name,
        ok: code === 0,
        skipped: code === SKIP_EXIT,
        skips,
        code: code ?? signal,
        seconds: Math.round((Date.now() - started) / 1000),
        tail,
      });
    });
  });
}

/** Dev or prod, from the landing page: `next dev` ships its dev tools in it. */
async function detectServer(base) {
  try {
    const html = await (await fetch(`${base}/`)).text();
    return /next-devtools|__nextDevTools|react-refresh/.test(html) ? "dev" : "prod";
  } catch {
    return "prod";
  }
}

async function main(argv) {
  const tier = arg(argv, "--tier", "smoke");
  if (tier !== "smoke" && tier !== "full" && tier !== "prod") {
    console.error(`run: --tier must be smoke, full or prod, not ${tier}`);
    process.exit(2);
  }
  const serverFlag = arg(argv, "--server", "auto");
  if (!["auto", "dev", "prod"].includes(serverFlag)) {
    console.error(`run: --server must be auto, dev or prod, not ${serverFlag}`);
    process.exit(2);
  }
  const available = readdirSync(HERE)
    .filter((f) => f.endsWith(".spec.mjs"))
    .map((f) => f.replace(/\.spec\.mjs$/, ""));
  const specs = specsFor(tier, available);

  if (argv.includes("--list")) {
    console.log(specs.join("\n"));
    return;
  }

  const base = process.env.BASE_URL;
  if (!base) {
    console.error("run: set BASE_URL to the server under test (a local `next dev`, or a preview URL).");
    process.exit(2);
  }
  const env = { ...process.env, BASE_URL: base };
  if (!env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/opt/pw-browsers")) env.PLAYWRIGHT_BROWSERS_PATH = "/opt/pw-browsers";
  const timeoutMs = Number(arg(argv, "--timeout", "240")) * 1000;

  const server = serverFlag === "auto" ? await detectServer(base) : serverFlag;
  if (tier === "prod" && server === "dev") {
    console.error(`run: ${base} is a next dev server; the prod tier needs \`next build && next start\` or a deployment (or --server prod to overrule the detection).`);
    process.exit(2);
  }

  console.log(`run: ${specs.length} ${tier} spec(s) against ${base} (${server} server)`);
  const results = [];
  for (const name of specs) {
    if (server === "dev" && PROD.includes(name)) {
      results.push({ name, deferred: true });
      console.log(`  prod  ${name}  (production-build property; run with --tier prod against next start)`);
      continue;
    }
    const result = await runOne(name, env, Math.max(timeoutMs, (SLOW[name] ?? 0) * 1000));
    results.push(result);
    const label = result.skipped ? "skip" : result.ok ? "pass" : "FAIL";
    const note = result.ok && result.skips.length > 0 ? `, ${result.skips.length} section(s) skipped` : "";
    console.log(`  ${label}  ${name}  (${result.seconds}s${note})`);
  }
  const ran = results.filter((r) => !r.deferred);
  const failed = ran.filter((r) => !r.ok && !r.skipped);
  const skipped = ran.filter((r) => r.skipped);
  const passed = ran.filter((r) => r.ok);
  const deferred = results.filter((r) => r.deferred);
  const withSkips = ran.filter((r) => r.skips.length > 0);
  for (const f of failed) console.log(`\n--- ${f.name} (exit ${f.code})\n${f.tail}`);
  if (withSkips.length > 0) {
    console.log("\nskipped sections (missing prerequisites, not passes):");
    for (const r of withSkips) for (const reason of [...new Set(r.skips)]) console.log(`  ${r.name}: ${reason}`);
  }
  console.log(
    `\nrun: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped, ${deferred.length} deferred to the prod tier, ${tier} tier.`,
  );
  process.exit(Math.min(failed.length, 100));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
