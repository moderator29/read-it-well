#!/usr/bin/env node
/**
 * Builds `apps/web/public/brand/vallo-email-lockup.png`: the glass mark and the
 * wordmark on their own rounded navy tile, as one picture, for the brand band
 * at the top of every email.
 *
 * WHY A PICTURE WITH ITS OWN GROUND. Mail clients that force a dark mode
 * (Gmail's apps above all) invert colours but leave images alone. A lockup
 * drawn on transparency sits on whatever the client made of the band behind
 * it; one carrying its own navy stays the brand on navy whatever happens. See
 * `LOCKUP_PATH` in `apps/web/src/lib/email/theme.ts`.
 *
 * Drawn by Chromium at three times the display size, from the two committed
 * brand files, so it stays sharp on a phone and changes only when they do:
 *
 *     node scripts/build-email-lockup.mjs
 *
 * Needs `playwright-core` and a Chromium (`PW_CHROMIUM` or the first one under
 * /opt/pw-browsers).
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = join(ROOT, "apps", "web", "public", "brand");
const OUT = join(BRAND, "vallo-email-lockup.png");

/* Mirrors theme.ts: HEADER (--nf-ink-950), LOCKUP_WIDTH, LOCKUP_HEIGHT, and the
   mark and wordmark boxes. */
const NAVY = "#010118";
const WIDTH = 198;
const HEIGHT = 56;
const SCALE = 3;

const dataUri = (file) => `data:image/png;base64,${readFileSync(join(BRAND, file)).toString("base64")}`;

const executablePath =
  process.env.PW_CHROMIUM ||
  execSync("find /opt/pw-browsers -name chrome -type f 2>/dev/null | head -1").toString().trim();

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: SCALE });
await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent;">
  <div id="tile" style="box-sizing:border-box;width:${WIDTH}px;height:${HEIGHT}px;border-radius:14px;background:${NAVY};
       padding:8px 14px;display:flex;align-items:center;gap:10px;">
    <img src="${dataUri("vallo-mark.png")}" style="width:42px;height:40px;display:block;" />
    <img src="${dataUri("vallo-wordmark.png")}" style="width:118px;height:26px;display:block;" />
  </div></body></html>`);
await page.locator("#tile").screenshot({ path: OUT, omitBackground: true });
await browser.close();
console.log(`wrote ${OUT} (${WIDTH * SCALE}x${HEIGHT * SCALE})`);
