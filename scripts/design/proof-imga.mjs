/*
 * IMG-A's PROOF WALK: GOVERNING-02, 03, 04 and 05 on a production server.
 *
 * Opens each screen on `next start`, at 390 dark, 390 light and 1536 dark,
 * presses what a person would press to reach the screens behind a control,
 * and measures the drawn radius over the drawn short side of every object the
 * shape law reaches. A ratio is read off the browser, never off the source.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://127.0.0.1:3197";
const OUT = process.env.OUT ?? "/home/user/read-it-well/docs/design/proofs/imga";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium",
  args: [
    "--use-gl=swiftshader",
    "--enable-unsafe-swiftshader",
    "--disable-lcd-text",
    "--force-device-scale-factor=1",
  ],
});

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1536, height: 1024 };
const FAIL_AT = 0.5;
const WARN_AT = 0.35;

const CONTROL_SELECTOR = [
  "button",
  ".nf-btn",
  ".nf-icon-btn",
  "label",
  "summary",
  "[class*=chip]",
  "[class*=badge]",
  "[class*=count]",
  "[class*=tag]",
  "[class*=seg]",
  "[class*=pill]",
  "input:not([type=range]):not([type=checkbox]):not([type=radio])",
  "select",
  "[role=button]",
  "[role=radio]",
  "[role=tab]",
  ".nf-regfield",
  ".nf-fieldgroup",
  ".nf-door",
  ".nf-marklabel",
].join(",");
const SHAPE_EXEMPT = [
  "[class*=avatar]",
  "[class*=skeleton]",
  "[class*=spinner]",
  "[class*=switch]",
  "[class*=story-ring]",
  "[class*=grip]",
  "[class*=progress]",
].join(",");

async function open(url, viewport, theme) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, colorScheme: theme });
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem("nf_theme", t);
    } catch {
      /* the attribute below still lands */
    }
  }, theme);
  const response = await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60_000 });
  const status = response?.status() ?? 0;
  if (status < 200 || status >= 300) {
    throw new Error(`REFUSING ${url}: server answered ${status}.`);
  }
  const landed = new URL(page.url()).pathname.replace(/\/$/, "") || "/";
  const asked = new URL(`${BASE}${url}`).pathname.replace(/\/$/, "") || "/";
  if (landed !== asked) throw new Error(`REFUSING ${url}: browser ended at ${landed}.`);
  await page.evaluate((t) => {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  }, theme);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
  await page.waitForTimeout(450);
  return page;
}

async function sweep(page) {
  return page.evaluate(
    ({ control, exempt, failAt, warnAt }) => {
      const out = [];
      for (const el of document.querySelectorAll(control)) {
        if (el.closest(exempt)) continue;
        const box = el.getBoundingClientRect();
        if (box.width < 8 || box.height < 8) continue;
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        const text = (el.textContent ?? "").trim();
        const radii = [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomLeftRadius,
          style.borderBottomRightRadius,
        ].map((r) => parseFloat(r) || 0);
        const radius = Math.max(...radii);
        const isPercent = [
          style.borderTopLeftRadius,
          style.borderBottomRightRadius,
        ].some((r) => r.includes("%"));
        const short = Math.min(box.width, box.height);
        const ratio = isPercent ? 0.5 : short > 0 ? radius / short : 0;
        if (ratio < warnAt) continue;
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: el.className?.toString?.().slice(0, 70) ?? "",
          w: Math.round(box.width),
          h: Math.round(box.height),
          radius: Math.round(radius * 100) / 100,
          ratio: Math.round(ratio * 1000) / 1000,
          text: text.slice(0, 40),
          hasText: text.length > 0,
          breach: ratio >= failAt && text.length > 0,
        });
      }
      return out;
    },
    { control: CONTROL_SELECTOR, exempt: SHAPE_EXEMPT, failAt: FAIL_AT, warnAt: WARN_AT },
  );
}

/** The objects this build is closing, measured by name rather than swept. */
async function measure(page, selectors) {
  return page.evaluate((list) => {
    const out = {};
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (!el) {
        out[sel] = null;
        continue;
      }
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const radius = parseFloat(style.borderTopLeftRadius) || 0;
      const short = Math.min(box.width, box.height);
      out[sel] = {
        w: Math.round(box.width),
        h: Math.round(box.height),
        radius,
        ratio: short > 0 ? Math.round((radius / short) * 1000) / 1000 : null,
        round: style.borderTopLeftRadius.includes("%"),
      };
    }
    return out;
  }, selectors);
}

const findings = [];
let breaches = 0;

/**
 * One screen, three shots and one sweep per width and theme.
 * `steps` runs against the live page before anything is captured.
 */
async function shoot(name, url, steps = async () => {}, probes = []) {
  const record = { name, url, shots: [], sweep: [], measured: {} };
  for (const [viewport, theme, tag] of [
    [PHONE, "dark", "390-dark"],
    [PHONE, "light", "390-light"],
    [DESKTOP, "dark", "1536-dark"],
  ]) {
    const page = await open(url, viewport, theme);
    await steps(page);
    await page.waitForTimeout(350);
    const file = `${OUT}/${name}-${tag}.png`;
    await page.screenshot({ path: file, fullPage: true });
    record.shots.push(file);
    const rows = await sweep(page);
    for (const row of rows) {
      row.theme = theme;
      row.width = viewport.width;
      if (row.breach) breaches += 1;
      record.sweep.push(row);
    }
    if (probes.length > 0 && tag === "390-dark") {
      record.measured = await measure(page, probes);
    }
    await page.close();
  }
  findings.push(record);
  const worst = record.sweep.reduce((m, r) => Math.max(m, r.ratio), 0);
  console.log(
    `${name.padEnd(30)} shots 3  over-${WARN_AT}: ${record.sweep.length}  worst ${worst}  breaches ${record.sweep.filter((r) => r.breach).length}`,
  );
}

const FIELD_PROBES = [".nf-regfield", ".nf-regfield .nf-field", ".nf-regfield__tag"];

/* ------------------------------------------------- GOVERNING-02, the chooser */
await shoot("chooser-1-doors", "/preview/b1b/chooser", async () => {}, [
  ".nf-door",
  ".nf-door__mark",
  ".nf-steprow__bar",
]);
await shoot(
  "chooser-2-owner-selected",
  "/preview/b1b/chooser",
  async (page) => {
    await page.getByRole("button", { name: /I own the property/i }).click();
  },
  [".nf-door[data-on]", ".nf-btn--primary"],
);
await shoot(
  "chooser-3-overview",
  "/preview/b1b/chooser",
  async (page) => {
    await page.getByRole("button", { name: /I own the property/i }).click();
    await page.getByRole("button", { name: /^Continue$/ }).click();
  },
  [".nf-door--calm", ".nf-calmpanel", ".nf-calmpanel__glyph"],
);

/* ------------------------------------------------ GOVERNING-03, the owner form */
await shoot("owner-1-about-you", "/preview/b1b/owner?step=0", async () => {}, [
  ...FIELD_PROBES,
  ".nf-calmpanel",
]);
await shoot(
  "owner-1-about-you-filled",
  "/preview/b1b/owner?step=0",
  async (page) => {
    await page.getByLabel(/Full name/i).fill("Oluwaseyi Omojuni");
    await page.getByLabel(/Phone number/i).fill("+234 801 234 5678");
    await page.getByLabel(/National identity number/i).fill("01234567890");
  },
  FIELD_PROBES,
);
await shoot("owner-2-where", "/preview/b1b/owner?step=1", async () => {}, FIELD_PROBES);
await shoot("owner-3-proof", "/preview/b1b/owner?step=2", async () => {}, [
  ".nf-door--compact",
  ".nf-choicemark",
]);
await shoot("owner-4-done", "/preview/b1b/owner-done", async () => {}, [
  ".nf-marklabel",
  ".nf-nextrow__tick",
]);

/* ----------------------------------------------- GOVERNING-04, the agent form */
await shoot("agent-1-about-you", "/preview/b1b/agent?step=0", async () => {}, [
  ".nf-fieldgroup",
  ...FIELD_PROBES,
]);
await shoot("agent-2-identity", "/preview/b1b/agent?step=1", async () => {}, [
  ".nf-door",
  ...FIELD_PROBES,
]);
await shoot("agent-3-fees", "/preview/b1b/agent?step=2", async () => {}, [
  ".nf-fieldgroup",
  ".nf-feestep",
  ".nf-feestep__step",
  ".nf-totalpanel",
]);
await shoot("agent-4-done", "/preview/b1b/agent-done", async () => {}, [".nf-marklabel"]);

/* ------------------------------------------------ GOVERNING-05, the firm form */
await shoot("firm-1-your-firm", "/preview/b1b/firm?step=0", async () => {}, [
  ...FIELD_PROBES,
  ".nf-fieldnote__glyph",
]);
await shoot("firm-2-association", "/preview/b1b/firm?step=1", async () => {}, [".nf-door"]);
await shoot(
  "firm-2-association-principal",
  "/preview/b1b/firm?step=1",
  async (page) => {
    await page.getByRole("radio", { name: /principal confirm/i }).click();
  },
  FIELD_PROBES,
);
await shoot("firm-3-team", "/preview/b1b/firm?step=2", async () => {}, [...FIELD_PROBES]);
await shoot(
  "firm-3-team-one",
  "/preview/b1b/firm?step=2",
  async (page) => {
    await page.getByLabel(/Name/i).first().fill("Tunde Adebayo");
    await page.getByRole("button", { name: /Add/i }).first().click();
  },
  [".nf-door__mark--avatar"],
);
await shoot("firm-4-under-review", "/preview/b1b/firm-done", async () => {}, [".nf-marklabel"]);

await browser.close();

console.log("\n================ OVER 0.35, EVERY ONE ================");
for (const record of findings) {
  const rows = record.sweep.filter((r) => r.ratio >= WARN_AT);
  if (rows.length === 0) continue;
  console.log(`\n${record.name}`);
  const seen = new Set();
  for (const row of rows) {
    const key = `${row.cls}|${row.w}x${row.h}|${row.ratio}|${row.theme}|${row.width}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(
      `  ${row.breach ? "BREACH" : "  ok  "} ${row.ratio}  ${row.radius}px on ${row.w}x${row.h}  ${row.theme}/${row.width}  ${row.hasText ? "text" : "no text"}  ${row.cls}  "${row.text}"`,
    );
  }
}

console.log("\n================ MEASURED BY NAME ====================");
for (const record of findings) {
  const entries = Object.entries(record.measured).filter(([, v]) => v);
  if (entries.length === 0) continue;
  console.log(`\n${record.name}`);
  for (const [sel, m] of entries) {
    console.log(
      `  ${sel.padEnd(30)} ${m.w}x${m.h}  r=${m.radius}${m.round ? " (round)" : ""}  ratio=${m.ratio}`,
    );
  }
}

console.log(`\nTOTAL BREACHES AT OR ABOVE ${FAIL_AT} ON A TEXT BEARING CONTROL: ${breaches}`);
process.exit(breaches > 0 ? 1 : 0);
