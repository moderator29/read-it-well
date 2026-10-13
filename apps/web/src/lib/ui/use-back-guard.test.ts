import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright-core";
import { isGuardEntry } from "./use-back-guard";

/**
 * The browser's Back on a form with unsaved changes (the host wizard): it asks
 * rather than leaving; Stay asks again next time; Discard leaves for the screen
 * before in one walk (never one too far); with nothing unsaved Back leaves in
 * one press; a back control that steps over the guard is not asked twice; and
 * a router refresh that wipes the guard's stamp does not lose the guard.
 * Driven in Chromium against the real hooks, bundled with React, with the
 * prompt drawn the way `Sheet` draws one (its own history entry and an
 * overlay registration).
 */
const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

const SRC = join(__dirname, "..", "..");

const ENTRY = `
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { useBackGuard } from "@/lib/ui/use-back-guard";
import { useSheetHistory, whenSheetsClosed } from "@/lib/ui/use-sheet-history";
import { joinOverlay, leaveOverlay } from "@/lib/ui/overlay-registry";
import { previousEntry } from "@/lib/nav/previous-entry";
function leave() {
  const prev = previousEntry();
  if (prev) history.go(-prev.distance);
}
function Demo() {
  const [dirty, setDirty] = useState(false);
  const [asking, setAsking] = useState(false);
  useSheetHistory(asking, "prompt", () => setAsking(false));
  useEffect(() => {
    if (!asking) return;
    const token = joinOverlay();
    return () => leaveOverlay(token);
  }, [asking]);
  useBackGuard(dirty, () => setAsking(true));
  return (
    <div>
      <button id="type" onClick={() => setDirty(true)}>type</button>
      <button id="save" onClick={() => setDirty(false)}>save</button>
      <button id="leave" onClick={leave}>back control</button>
      <button id="stay" onClick={() => setAsking(false)}>stay</button>
      <button id="discard" onClick={() => { setDirty(false); setAsking(false); whenSheetsClosed(leave); }}>discard</button>
      <output id="asking">{asking ? "yes" : "no"}</output>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<Demo />);
`;

describe.skipIf(!CHROMIUM && !process.env.CI)("the browser's Back on unsaved changes (real Chromium)", () => {
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

  /** Three screens in a row: /start, /prev, then the form at /wizard. */
  async function page(): Promise<Page> {
    const p = await browser.newPage();
    await p.route("http://guard.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script>${bundle.replace(/<\/script>/g, "<\\/script>")}</script></body></html>`,
      }),
    );
    await p.goto("http://guard.test/start");
    await p.goto("http://guard.test/prev");
    await p.goto("http://guard.test/wizard");
    await p.waitForSelector("#type");
    return p;
  }
  const path = (p: Page) => new URL(p.url()).pathname;
  const asking = (p: Page) => p.textContent("#asking");
  const guardOnTop = (p: Page) => p.waitForFunction(() => Boolean(history.state && (history.state as Record<string, unknown>).nfUnsaved));

  it("pushes nothing while nothing is unsaved, one entry once something is", async () => {
    const p = await page();
    const before = await p.evaluate(() => history.length);
    await p.waitForTimeout(50);
    expect(await p.evaluate(() => history.length)).toBe(before);
    await p.click("#type");
    await guardOnTop(p);
    expect(await p.evaluate(() => history.length)).toBe(before + 1);
    await p.close();
  });

  it("asks instead of leaving, and stays on the form", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#asking")?.textContent === "yes");
    expect(path(p)).toBe("/wizard");
    await p.close();
  });

  it("asks again after Stay", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#asking")?.textContent === "yes");
    await p.click("#stay");
    await guardOnTop(p);
    expect(await asking(p)).toBe("no");
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#asking")?.textContent === "yes");
    expect(path(p)).toBe("/wizard");
    await p.close();
  });

  it("Discard leaves for the screen before, not one further back", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#asking")?.textContent === "yes");
    await p.click("#discard");
    await p.waitForURL("http://guard.test/prev");
    await p.waitForTimeout(200);
    expect(path(p)).toBe("/prev");
    await p.close();
  });

  it("with nothing left unsaved, one Back leaves", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    await p.click("#save");
    await p.evaluate(() => history.back());
    await p.waitForURL("http://guard.test/prev");
    expect(path(p)).toBe("/prev");
    await p.close();
  });

  it("a back control that steps over the guard leaves without asking again", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    await p.click("#leave");
    await p.waitForURL("http://guard.test/prev");
    expect(path(p)).toBe("/prev");
    await p.close();
  });

  it("keeps the guard when a router refresh wipes its stamp", async () => {
    const p = await page();
    await p.click("#type");
    await guardOnTop(p);
    /* What Next's refresh does to the top entry's state. */
    await p.evaluate(() => history.replaceState({ __NA: true }, ""));
    await p.evaluate(() => history.back());
    await p.waitForFunction(() => document.querySelector("#asking")?.textContent === "yes");
    expect(path(p)).toBe("/wizard");
    await p.close();
  });
});

describe("the guard stamp", () => {
  it("reads only its own stamp", () => {
    expect(isGuardEntry({ nfUnsaved: true })).toBe(true);
    expect(isGuardEntry({ __NA: true })).toBe(false);
    expect(isGuardEntry({ nfUnsaved: "yes" })).toBe(false);
    expect(isGuardEntry(null)).toBe(false);
  });
});
