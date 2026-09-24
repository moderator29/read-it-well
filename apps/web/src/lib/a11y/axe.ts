/**
 * axe-core over server-rendered HTML, in a real Chromium. Test-only.
 *
 * A component is rendered to static markup with the client React build
 * (`*.dom.test.tsx` project), the markup is loaded into Chromium with the
 * product's own accessibility-relevant CSS stand-ins (sr-only, overflow), and
 * axe runs the WCAG 2.1 A/AA and best-practice rules the audit ran live. What
 * comes back is the list of violations: rule id, impact and the offending
 * element's HTML.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium, type Browser } from "playwright-core";

const CHROMIUM = [
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  "/opt/pw-browsers/chromium/chrome-linux/chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].find((path) => existsSync(path));

export const hasBrowser = Boolean(CHROMIUM);

const AXE_SOURCE = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

/** The CSS the rules depend on: what is visually hidden, what scrolls. */
const BASE_CSS = `
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.nf-scroll-x{overflow-x:auto;display:flex}
body{margin:0;width:390px}
`;

export type AxeViolation = { id: string; impact: string | null; nodes: string[] };

let browser: Browser | null = null;

export async function closeAxe(): Promise<void> {
  await browser?.close();
  browser = null;
}

/**
 * Run axe over an HTML fragment. `rules` narrows the run to specific rule ids
 * (the ones a finding named); omit it for the full tag set.
 */
export async function axe(
  html: string,
  opts: { rules?: string[]; css?: string; strict?: boolean } = {},
): Promise<AxeViolation[]> {
  if (!CHROMIUM) throw new Error("no Chromium binary for the axe run");
  browser ??= await chromium.launch({ executablePath: CHROMIUM, args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent(
      `<!doctype html><html lang="en"><head><title>axe</title><style>${BASE_CSS}${opts.css ?? ""}</style></head><body><main>${html}</main></body></html>`,
    );
    await page.addScriptTag({ content: AXE_SOURCE });
    const result = await page.evaluate(async ({ rules, strict }) => {
      type Found = { id: string; impact: string | null; nodes: { html: string }[] };
      const w = window as unknown as {
        axe: { run: (ctx: unknown, options: unknown) => Promise<{ violations: Found[]; incomplete: Found[] }> };
      };
      const options = rules
        ? { runOnly: { type: "rule", values: rules } }
        : { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } };
      const out = await w.axe.run(document, options);
      /* `strict` also fails on "needs review": a markup-only render has no
         product stylesheet, so axe cannot always see what the live page shows
         and reports the same defect as incomplete rather than violated. */
      const found = strict ? [...out.violations, ...out.incomplete] : out.violations;
      return found.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.html.slice(0, 200)) }));
    }, { rules: opts.rules ?? null, strict: opts.strict ?? false });
    return result;
  } finally {
    await page.close();
  }
}
