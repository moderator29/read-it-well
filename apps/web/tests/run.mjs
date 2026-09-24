#!/usr/bin/env node
/**
 * THE BROWSER SPEC RUNNER, WITH A SMOKE TIER. V-51.
 *
 * `apps/web/tests/` holds 88 browser specs, each a plain Node script that
 * drives Chromium against `BASE_URL` and exits non-zero on a failure. Nothing
 * ran them: they ran when somebody remembered, which is how specs rot. This
 * runs them, in two tiers:
 *
 *   smoke   ten specs covering the surfaces a broken deploy hurts first: the
 *           sign-in wall, error copy, the PWA and offline shell, Save-Data,
 *           fonts, checkout, the wallet, a listing, messages, and the admin
 *           console. Meant to block a merge, once CI exists again.
 *   full    every `*.spec.mjs`. Meant for a nightly run on `main`.
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

export function specsFor(tier, available) {
  if (tier === "full") return [...available].sort();
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
    const child = spawn(process.execPath, [join(HERE, `${name}.spec.mjs`)], { env, stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const keep = (chunk) => {
      tail = (tail + chunk.toString()).split("\n").slice(-12).join("\n");
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    const timer = setTimeout(() => {
      tail += `\n[run] timed out after ${Math.round(timeoutMs / 1000)}s`;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ name, ok: code === 0, code: code ?? signal, seconds: Math.round((Date.now() - started) / 1000), tail });
    });
  });
}

async function main(argv) {
  const tier = arg(argv, "--tier", "smoke");
  if (tier !== "smoke" && tier !== "full") {
    console.error(`run: --tier must be smoke or full, not ${tier}`);
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

  console.log(`run: ${specs.length} ${tier} spec(s) against ${base}`);
  const results = [];
  for (const name of specs) {
    const result = await runOne(name, env, timeoutMs);
    results.push(result);
    console.log(`  ${result.ok ? "pass" : "FAIL"}  ${name}  (${result.seconds}s)`);
  }
  const failed = results.filter((r) => !r.ok);
  for (const f of failed) console.log(`\n--- ${f.name} (exit ${f.code})\n${f.tail}`);
  console.log(`\nrun: ${results.length - failed.length} passed, ${failed.length} failed, ${tier} tier.`);
  process.exit(Math.min(failed.length, 100));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error);
    process.exit(2);
  });
}
