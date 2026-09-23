#!/usr/bin/env node
/*
 * Writes `native-shell/shell-config.js`: the live origin the offline card
 * retries, and the path the app opens on (STORE-01).
 *
 * Run before every `npx cap sync` with the same CAPACITOR_SERVER_URL the sync
 * uses (`npm run cap:sync --workspace @vallo/web` does both). Fails, loudly,
 * when the variable is unset or is not an https origin: a shell packaged
 * without an origin can only ever show its "needs updating" card.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/* The one value `capacitor.config.ts` also reads for `server.appStartPath`. */
const NATIVE_START_PATH = JSON.parse(
  readFileSync(fileURLToPath(new URL("../native-shell/start-path.json", import.meta.url)), "utf8"),
).startPath;

const origin = (process.env.CAPACITOR_SERVER_URL ?? "").trim().replace(/\/+$/, "");
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error(
    `write-shell-config: CAPACITOR_SERVER_URL must be an https origin such as https://www.vallospaces.com (got ${JSON.stringify(origin)}).`,
  );
  process.exit(1);
}

const target = fileURLToPath(new URL("../native-shell/shell-config.js", import.meta.url));
writeFileSync(
  target,
  `/* Written by scripts/write-shell-config.mjs from CAPACITOR_SERVER_URL. Do not edit by hand. */\n` +
    `window.__VALLO_ORIGIN__ = ${JSON.stringify(origin)};\n` +
    `window.__VALLO_START_PATH__ = ${JSON.stringify(NATIVE_START_PATH)};\n`,
);
console.log(`write-shell-config: ${origin}${NATIVE_START_PATH}`);
