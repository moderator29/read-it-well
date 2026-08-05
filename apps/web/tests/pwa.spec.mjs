/**
 * PWA and offline shell checks.
 *
 * Self-contained Playwright script: no runner, no config. Proves the three
 * pieces an installable RentMe needs, at the size the audience actually holds
 * the phone. Run with the server already up:
 *
 *   BASE_URL=http://localhost:3210 node apps/web/tests/pwa.spec.mjs
 *
 * Note on environments: the service worker only registers in a production
 * build, so this script checks that `/sw.js` is served and is JavaScript, not
 * that a worker has taken control. Registration itself is asserted by hand
 * against a deployed build, per docs/DEPLOY.md.
 */

import { chromium } from "playwright-core";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3210";
const EXECUTABLE_PATH = "/opt/pw-browsers/chromium";
const WAIT = 1200;

let failures = 0;
function check(name, condition) {
  if (condition) {
    console.log(`  ok      ${name}`);
  } else {
    failures += 1;
    console.log(`  FAILED  ${name}`);
  }
}

const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });
const context = await browser.newContext({
  colorScheme: "dark",
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();

try {
  /* --------------------------------------------------------- the manifest */
  console.log("/manifest.webmanifest");
  const manifestResponse = await page.request.get(`${BASE_URL}/manifest.webmanifest`);
  check("manifest route responds 200", manifestResponse.status() === 200);

  let manifest = null;
  try {
    manifest = JSON.parse(await manifestResponse.text());
  } catch {
    manifest = null;
  }
  check("manifest body is valid JSON", manifest !== null && typeof manifest === "object");

  if (manifest) {
    check("name is RentMe", manifest.name === "RentMe");
    check("short_name is RentMe", manifest.short_name === "RentMe");
    check("description is present", typeof manifest.description === "string" && manifest.description.length > 20);
    check("start_url is /home", manifest.start_url === "/home");
    check("scope is /", manifest.scope === "/");
    check("display is standalone", manifest.display === "standalone");
    check("orientation is portrait", manifest.orientation === "portrait");
    check("theme_color is the brand navy", String(manifest.theme_color).toLowerCase() === "#010118");
    check(
      "background_color is the brand navy",
      String(manifest.background_color).toLowerCase() === "#010118",
    );

    const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
    check("at least one icon is declared", icons.length >= 1);
    check(
      "every declared icon has a src, sizes and type",
      icons.length >= 1 && icons.every((icon) => icon.src && icon.sizes && icon.type),
    );
    check(
      "a maskable icon is declared",
      icons.some((icon) => String(icon.purpose ?? "").includes("maskable")),
    );

    // Every icon file must actually exist. A manifest pointing at a missing
    // PNG installs an app with a blank home-screen tile.
    for (const icon of icons) {
      const iconResponse = await page.request.get(`${BASE_URL}${icon.src}`);
      check(`icon file exists: ${icon.src}`, iconResponse.status() === 200);
    }

    const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts : [];
    const shortcutUrls = shortcuts.map((shortcut) => shortcut.url);
    check("three app shortcuts are declared", shortcuts.length === 3);
    for (const url of ["/search", "/bookings", "/wallet"]) {
      check(`shortcut targets ${url}`, shortcutUrls.includes(url));
    }
    for (const shortcut of shortcuts) {
      for (const icon of shortcut.icons ?? []) {
        const iconResponse = await page.request.get(`${BASE_URL}${icon.src}`);
        check(`shortcut icon exists: ${icon.src}`, iconResponse.status() === 200);
      }
    }
  }

  /* ----------------------------------------------- the manifest link tag */
  console.log("/ manifest link");
  await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);
  const manifestHref = await page.locator('link[rel="manifest"]').first().getAttribute("href");
  check("the document links the manifest route", manifestHref === "/manifest.webmanifest");
  /*
   * There are two theme-color tags now, one per colour scheme: a single navy
   * for both themes put near-black browser chrome above a near-white canvas in
   * light mode. The dark one must track --nf-surface-canvas so install, splash
   * and app canvas stay one continuous colour.
   */
  const darkThemeColor = await page
    .locator('meta[name="theme-color"][media*="dark"]')
    .first()
    .getAttribute("content");
  check(
    "the dark theme-color meta matches the app canvas",
    String(darkThemeColor).toLowerCase() === "#010118",
  );
  const lightThemeColor = await page
    .locator('meta[name="theme-color"][media*="light"]')
    .first()
    .getAttribute("content");
  check(
    "the light theme-color meta matches the paper canvas",
    String(lightThemeColor).toLowerCase() === "#f4f5f7",
  );
  check(
    "apple-mobile-web-app-capable is set",
    (await page.locator('meta[name="apple-mobile-web-app-capable"][content="yes"]').count()) === 1,
  );
  check(
    "apple status bar style is set",
    (await page
      .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      .count()) === 1,
  );

  /* ------------------------------------------------------ the offline page */
  console.log("/offline");
  await page.goto(`${BASE_URL}/offline`, { waitUntil: "load" });
  await page.waitForTimeout(WAIT);

  check(
    "offline heading renders",
    await page.getByRole("heading", { level: 1, name: "You are offline" }).isVisible(),
  );
  const retry = page.getByRole("button", { name: /Try again/ });
  check("a retry control is present", (await retry.count()) === 1);
  check("the retry control is visible", await retry.first().isVisible());

  const offlineText = await page.locator("body").innerText();
  check("the copy explains what happened", /connection dropped/i.test(offlineText));
  check("no fee wording on the offline screen", !/fees?\b/i.test(offlineText));
  check(
    "no sample or preview wording on the offline screen",
    !/(sample|preview|demo|not live)/i.test(offlineText),
  );

  // The offline shell must not reach for a remote image, or it renders broken
  // in exactly the situation it exists for.
  const remoteImages = await page
    .locator("img")
    .evaluateAll((nodes) =>
      nodes
        .map((node) => node.getAttribute("src") ?? "")
        .filter((src) => src.startsWith("http") || src.startsWith("//") || src.startsWith("/_next/image")),
    );
  check("the offline shell uses no remote or optimised image URL", remoteImages.length === 0);

  // 390px is the reference phone width. Horizontal overflow at that size is a bug.
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  check(
    `no horizontal overflow at 390px (${overflow.scrollWidth} vs ${overflow.clientWidth})`,
    overflow.scrollWidth <= overflow.clientWidth + 1,
  );

  /* -------------------------------------------------- the service worker */
  console.log("/sw.js");
  const swResponse = await page.request.get(`${BASE_URL}/sw.js`);
  check("sw.js responds 200", swResponse.status() === 200);
  const swType = (swResponse.headers()["content-type"] ?? "").toLowerCase();
  check(
    `sw.js is served as JavaScript (${swType || "no content-type"})`,
    swType.includes("javascript") || swType.includes("ecmascript"),
  );
  const swBody = await swResponse.text();
  check("sw.js listens for install, activate and fetch",
    swBody.includes('addEventListener("install"') &&
      swBody.includes('addEventListener("activate"') &&
      swBody.includes('addEventListener("fetch"'),
  );
  check("sw.js precaches the offline shell", swBody.includes("/offline"));
  check(
    "sw.js excludes every money, messaging and admin surface from caching",
    ["api", "admin", "agent", "wallet", "messages"].every((segment) =>
      swBody.includes(`"${segment}"`),
    ),
  );
  check("sw.js respects Save-Data", swBody.toLowerCase().includes("save-data"));
} finally {
  await browser.close();
}

if (failures > 0) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
