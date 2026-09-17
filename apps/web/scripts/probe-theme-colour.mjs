/*
 * Does the browser chrome colour follow the PAGE, or the operating system?
 *
 * The four cases that matter are the cross product of "what has this person
 * stored" and "what is their phone set to". Three of the four used to be
 * right by accident and the fourth, a first-time visitor on a light phone,
 * was the whole bug: dark canvas, pale chrome.
 */
import { chromium } from "playwright-core";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const browser = await chromium.launch({ executablePath: EXE });

const CASES = [
  ["nothing stored", null, "dark"],
  ["nothing stored", null, "light"],
  ["chose dark", "dark", "light"],
  ["chose light", "light", "dark"],
  ["chose system", "system", "light"],
  ["chose system", "system", "dark"],
];

console.log("stored          OS      page    chrome     verdict");
for (const [label, stored, os] of CASES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: os });
  if (stored) await ctx.addInitScript(`try{localStorage.setItem('nf_theme', ${JSON.stringify(stored)})}catch(e){}`);
  const page = await ctx.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "domcontentloaded" });
  const r = await page.evaluate(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
    const applicable = metas.find((m) => {
      const q = m.getAttribute("media");
      return !q || window.matchMedia(q).matches;
    });
    return {
      page: document.documentElement.dataset.theme === "light" ? "light" : "dark",
      chrome: applicable ? applicable.getAttribute("content") : "(none)",
      count: metas.length,
    };
  });
  const chromeTheme = r.chrome === "#F4F5F7" ? "light" : r.chrome === "#010118" ? "dark" : "?";
  const verdict = chromeTheme === r.page ? "match" : "MISMATCH";
  console.log(
    `${label.padEnd(15)} ${os.padEnd(7)} ${r.page.padEnd(7)} ${r.chrome.padEnd(10)} ${verdict}`,
  );
  await ctx.close();
}
await browser.close();
