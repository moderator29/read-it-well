import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright-core";
import { readSheetMarker } from "./use-sheet-history";

/**
 * UX-19: with a sheet open, the browser's Back closes the sheet and stays on
 * the page; closing the sheet by its own control takes its history entry back
 * off; a navigation made while it closes is not undone. Driven in Chromium
 * against the real hook, bundled with React.
 */
const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

const SRC = join(__dirname, "..", "..");

const ENTRY = `
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { useSheetHistory } from "@/lib/ui/use-sheet-history";
function Demo() {
  const [open, setOpen] = useState(false);
  useSheetHistory(open, "demo", () => setOpen(false));
  return (
    <div style={{ minHeight: "4000px" }}>
      <button id="open" onClick={() => setOpen(true)}>open</button>
      <button id="close" onClick={() => setOpen(false)}>close</button>
      <button id="close-and-go" onClick={() => { setOpen(false); history.pushState({ page: "next" }, "", "/next"); }}>go</button>
      <output id="state">{open ? "open" : "closed"}</output>
      <button id="open-low" style={{ position: "absolute", top: "1500px" }} onClick={() => setOpen(true)}>open low</button>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Demo />);
`;

describe.skipIf(!CHROMIUM && !process.env.CI)("Back and an open sheet (real Chromium)", () => {
  let browser: Browser;
  let bundle = "";

  beforeAll(async () => {
    if (!CHROMIUM) throw new Error("CI must have a Chromium to run this check");
    const out = await build({
      stdin: { contents: ENTRY, loader: "tsx", resolveDir: SRC },
      bundle: true,
      write: false,
      format: "iife",
      jsx: "automatic",
      alias: { "@": SRC },
      nodePaths: [join(SRC, "..", "node_modules"), join(SRC, "..", "..", "..", "node_modules")],
      define: { "process.env.NODE_ENV": '"production"' },
      logLevel: "silent",
    });
    bundle = out.outputFiles[0]!.text;
    browser = await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
  });

  async function page(): Promise<Page> {
    const p = await browser.newPage();
    await p.route("http://sheet.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script>${bundle.replace(/<\/script>/g, "<\\/script>")}</script></body></html>`,
      }),
    );
    await p.goto("http://sheet.test/wallet");
    await p.waitForSelector("#open");
    return p;
  }
  const state = (p: Page) => p.textContent("#state");
  const depth = (p: Page) => p.evaluate(() => history.length);

  it("Back closes the sheet and stays on the page", async () => {
    const p = await page();
    const before = await depth(p);
    await p.click("#open");
    expect(await state(p)).toBe("open");
    expect(await depth(p)).toBe(before + 1);
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#state")?.textContent === "closed");
    expect(new URL(p.url()).pathname).toBe("/wallet");
    await p.close();
  });

  it("closing by its own control takes its entry back off", async () => {
    const p = await page();
    await p.click("#open");
    await p.click("#close");
    await p.waitForFunction(() => !(history.state && (history.state as Record<string, unknown>).nfSheet));
    expect(await state(p)).toBe("closed");
    expect(new URL(p.url()).pathname).toBe("/wallet");
    await p.close();
  });

  it("keeps the reader's place on the page through Back and through a close", async () => {
    const p = await page();
    await p.evaluate(() => window.scrollTo(0, 1200));
    await p.click("#open-low");
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#state")?.textContent === "closed");
    await p.waitForTimeout(100);
    expect(await p.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1000);
    await p.click("#open-low");
    await p.evaluate(() => (document.querySelector("#close") as HTMLButtonElement).click());
    await p.waitForTimeout(150);
    expect(await p.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(1000);
    await p.close();
  });

  it("does not undo a navigation made as the sheet closes", async () => {
    const p = await page();
    await p.click("#open");
    await p.click("#close-and-go");
    await p.waitForTimeout(150);
    expect(new URL(p.url()).pathname).toBe("/next");
    await p.close();
  });
});

describe("the history marker", () => {
  it("reads only its own marker", () => {
    expect(readSheetMarker({ nfSheet: "a" })).toBe("a");
    expect(readSheetMarker({ __NA: true })).toBeNull();
    expect(readSheetMarker(null)).toBeNull();
  });
});
