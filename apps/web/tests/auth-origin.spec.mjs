/**
 * Where a sign-up sends the browser back to.
 *
 * THIS SPEC EXISTS BECAUSE OF A REAL FAILURE. The first Google sign-up this
 * platform ever had completed: the account was created and confirmed at
 * 10:18:25 on 7 August. The browser was then sent to `http://localhost:3000`,
 * which a phone cannot reach, and the person was left looking at "Safari can't
 * open the page because it couldn't connect to the server" holding a working
 * account they could not use.
 *
 * The address a browser is sent back to is not a configuration question. The
 * host the reader is ON is in the request they just made, and on Vercel it
 * arrives as `x-forwarded-host` with `x-forwarded-proto` beside it. An
 * environment variable has to be set correctly by hand on every environment,
 * and when it is wrong nothing fails until somebody is standing at the door.
 *
 * Read as a unit rather than through a browser, because the thing being tested
 * is what a header resolves to and there is no screen involved.
 *
 *   node apps/web/tests/auth-origin.spec.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..");

let failures = 0;
function check(name, condition, detail) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
    if (detail) for (const line of [].concat(detail).slice(0, 8)) console.log(`            ${line}`);
  }
}

/**
 * Run `authOrigin()` against a set of headers, with `next/headers` stubbed.
 *
 * The real module is server-only and needs a request, so the smallest honest
 * way to exercise it is to hand it the headers it would have read.
 */
function originFor(headers, env = {}) {
  /*
   * The real module imports `next/headers`, which needs a request. The stub
   * takes its place and the rest of the file is the real source, byte for
   * byte, so this tests the shipped logic rather than a copy of it.
   *
   * Written to a file and imported rather than evaluated as a string: node
   * strips types when it LOADS a .ts file, and not for `-e`.
   */
  const source = readFileSync(join(web, "src/lib/site.ts"), "utf8").replace(
    'import { headers } from "next/headers";',
    `const headers = async () => ({ get: (k) => (${JSON.stringify(headers)})[k] ?? null });`,
  );
  const stub = join(web, `site.origin-probe.${process.pid}.ts`);
  const runner = join(web, `site.origin-run.${process.pid}.mjs`);
  writeFileSync(stub, source);
  writeFileSync(
    runner,
    `${Object.entries(env)
      .map(([k, v]) => `process.env[${JSON.stringify(k)}] = ${JSON.stringify(v)};`)
      .join("\n")}
const { authOrigin } = await import(${JSON.stringify(`./${stub.split("/").pop()}`)});
console.log(await authOrigin());`,
  );
  try {
    return execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--no-warnings", runner],
      { cwd: web, encoding: "utf8" },
    ).trim();
  } finally {
    rmSync(stub, { force: true });
    rmSync(runner, { force: true });
  }
}

console.log("\nThe host the reader is actually on");

check(
  "a real deployment gets its own https origin",
  originFor({ "x-forwarded-host": "rentme.ng", "x-forwarded-proto": "https" }) ===
    "https://rentme.ng",
);
check(
  "a Vercel preview gets the preview host, not the production one",
  originFor({
    "x-forwarded-host": "read-it-well-git-branch.vercel.app",
    "x-forwarded-proto": "https",
  }) === "https://read-it-well-git-branch.vercel.app",
);
check(
  "the request wins over a stale NEXT_PUBLIC_SITE_URL",
  originFor(
    { "x-forwarded-host": "rentme.ng", "x-forwarded-proto": "https" },
    { NEXT_PUBLIC_SITE_URL: "http://localhost:3000" },
  ) === "https://rentme.ng",
  ["this is the exact failure: an env var saying localhost while a phone is on the real host"],
);
check(
  "plain host is read when there is no proxy in front",
  originFor({ host: "rentme.ng" }) === "https://rentme.ng",
);
check(
  "localhost is still http, because locally it is",
  originFor({ host: "localhost:3210" }) === "http://localhost:3210",
);
check(
  "a proxy listing several schemes is read as the first one",
  originFor({ "x-forwarded-host": "rentme.ng", "x-forwarded-proto": "https,http" }) ===
    "https://rentme.ng",
);
check(
  "no request at all falls back to the configured URL",
  originFor({}, { NEXT_PUBLIC_SITE_URL: "https://rentme.ng" }) === "https://rentme.ng",
);

console.log("\nWhat the auth actions use");
const actions = readFileSync(join(web, "src/lib/auth/actions.ts"), "utf8");
const callbacks = actions.match(/\/auth\/callback/g) ?? [];
const viaOrigin = actions.match(/await authOrigin\(\)\}\/auth\/callback/g) ?? [];
check(
  `all ${callbacks.length} redirect URLs are built from the request, not from an env var`,
  callbacks.length > 0 && callbacks.length === viaOrigin.length,
  [`${viaOrigin.length} of ${callbacks.length}`],
);
check("nothing in the auth path still reads siteUrl directly", !/\bsiteUrl\(\)/.test(actions));

console.log("\nSigning up with an address that already has an account");
check(
  "an empty identities array is caught rather than treated as success",
  /identities\?\.length \?\? 0\) === 0/.test(actions),
  ["Supabase answers 200 and sends no email when the address is already registered"],
);
check(
  "and the answer sends them to sign in rather than to a code that will never arrive",
  /cannot be signed up again[\s\S]{0,160}sign in instead/.test(actions),
);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
