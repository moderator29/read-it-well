/**
 * The console is a tool, not an article.
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/admin-console.spec.mjs
 *
 * Every admin screen was `mx-auto max-w-3xl`. 768px is the right measure for
 * something somebody READS and the wrong one for something somebody WORKS in:
 * on the 1440px display an operator actually reviews reports on, two thirds of
 * the screen sat empty and every queue ran twice as long as it needed to.
 *
 * So this measures geometry at three widths and asserts the console behaves
 * like a console: it uses the width it is given up to a bound, its queues go to
 * two columns once there is room for two, and none of that costs anything on a
 * phone, where one column is still correct.
 *
 * Access is decided in the layout before any queue is read, so a run without an
 * admin session gets the access screen. That is asserted rather than worked
 * around, and the console geometry is measured against the real stylesheet
 * through a fixture that carries the same class names the pages carry - which
 * is the only way to measure a surface this sandbox cannot sign in to.
 */

import { chromium } from "playwright-core";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = path.join(ROOT, "src/app/admin");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}${detail ? `\n          ${detail}` : ""}`);
  }
}

/* ------------------------------------------------------------ no clamps left */

console.log("\n[source] every console screen is on the console measure");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const files = walk(ADMIN);
const clamped = files.filter((file) => /className=(?:"|\{`)[^"`]*max-w-(?:3xl|4xl)/.test(readFileSync(file, "utf8")));
check(
  "no admin screen is clamped to a reading measure",
  clamped.length === 0,
  clamped.map((f) => path.relative(ROOT, f)).join("\n          "),
);

const consoleUsers = files.filter((file) => readFileSync(file, "utf8").includes("nf-console"));
check("the console measure is actually used", consoleUsers.length >= 14, `${consoleUsers.length} files`);

const queueLists = files.reduce(
  (total, file) => total + (readFileSync(file, "utf8").match(/nf-queue-list/g) ?? []).length,
  0,
);
check("the queues are grids, not columns", queueLists >= 15, `${queueLists} lists`);

check(
  "the skeleton is on the same measure as the page it stands in for",
  /width = "nf-console"/.test(readFileSync(path.join(ADMIN, "_components/QueueSkeleton.tsx"), "utf8")),
);

/* --------------------------------------------------------------- the geometry */

const CSS = await (await fetch(
  `${BASE_URL}/_next/static/chunks/%5Broot-of-the-server%5D__0rd0r_d._.css`,
)).text();

const FIXTURE = `<!doctype html><html data-theme="dark"><head><meta charset="utf-8">
<style>${CSS}</style></head><body>
<div id="console" class="nf-console">
  <ul id="queue" class="nf-queue-list">
    <li id="c1" class="nf-card p-4">one</li>
    <li id="c2" class="nf-card p-4">two</li>
    <li id="c3" class="nf-card p-4">three</li>
  </ul>
</div></body></html>`;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

async function geometry(width, label) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  await page.setContent(FIXTURE, { waitUntil: "load" });
  const box = await page.evaluate(() => {
    const rect = (id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top) };
    };
    return { shell: rect("console"), c1: rect("c1"), c2: rect("c2") };
  });
  await context.close();
  return { label, width, ...box };
}

console.log("\n[geometry] the console at three widths");

const phone = await geometry(390, "phone");
check(
  "on a phone the console uses the whole width",
  phone.shell.right - phone.shell.left === 390,
  `${phone.shell.right - phone.shell.left}px`,
);
check(
  "and the queue stays one column",
  phone.c2.top > phone.c1.top,
  `card 2 top ${phone.c2.top} vs card 1 top ${phone.c1.top}`,
);

const laptop = await geometry(1440, "laptop");
const laptopWidth = laptop.shell.right - laptop.shell.left;
check(
  "on a 1440px display the console is far wider than the old 768",
  laptopWidth >= 1200,
  `${laptopWidth}px`,
);
check(
  "and the queue is two columns",
  laptop.c2.top === laptop.c1.top && laptop.c2.left > laptop.c1.left,
  `card 2 at ${laptop.c2.left},${laptop.c2.top}; card 1 at ${laptop.c1.left},${laptop.c1.top}`,
);

const wide = await geometry(2560, "4K");
const wideWidth = wide.shell.right - wide.shell.left;
check(
  "on a very wide display it stops rather than stretching a row to a metre",
  wideWidth === 1440,
  `${wideWidth}px`,
);
check("and it is centred", wide.shell.left === (2560 - 1440) / 2, `left ${wide.shell.left}`);

/* ------------------------------------------------------------------ the gate */

console.log("\n[live] /admin without a staff session");
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const serverErrors = [];
page.on("response", (r) => {
  if (r.status() >= 500) serverErrors.push(`${r.status()} ${r.url()}`);
});
await page.goto(`${BASE_URL}/admin`, { waitUntil: "load" });
const text = await page.evaluate(() => document.body.innerText);
check(
  "the access gate answers instead of a queue",
  text.length > 0 && !/report|ticket|flag/i.test(text.slice(0, 200)),
  text.slice(0, 160).replace(/\s+/g, " "),
);
check("no server error", serverErrors.length === 0, serverErrors.join("\n"));
await context.close();

await browser.close();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
