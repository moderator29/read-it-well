/**
 * Test-only: what a browser test needs to ask "does this shared surface still
 * fit in each of the four locales, at 390px" (north star checklist point 22).
 *
 *   appCss(...sheets)   the product's REAL cascade: `globals.css` compiled with
 *                       Tailwind (so utilities such as `grid` and `px-sm` exist,
 *                       which the hand-assembled `productCss` cannot supply),
 *                       the self-hosted Inter and Poppins faces inlined (so text
 *                       measures at the width a phone gives it, not at a fallback
 *                       font's), and the route sheets a component imports for
 *                       itself. Compiled once per source change and cached.
 *   fitMount(...)       mounts a body of JSX in Chromium at 390 by 844, in one
 *                       locale: the real dictionary for that locale in the copy
 *                       provider, and the locale cookie set so a client hook that
 *                       reads the cookie agrees with it.
 *   auditFit(page)      the three findings, as plain strings naming the element
 *                       and the words in it: PAGE OR ELEMENT OVERFLOW sideways,
 *                       a LABEL CLIPPED OR ELLIPSISED where it should wrap, and
 *                       a TAP TARGET under 44px.
 *
 * The audit is deliberately strict about the label rule and lenient about what
 * the design chooses: an element that sets `-webkit-line-clamp` truncates on
 * purpose and is not reported; an ellipsis on text that is not a control's own
 * label (a file name, a place line) is the design's, and is not reported; a
 * button, chip, tab or segment label that is cut, or text clipped by a box that
 * hides its overflow, is.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import type { Page } from "playwright-core";
import { LOCALE_COOKIE } from "@/lib/locale.constants";
import { mountInBrowser, type Mounted } from "@/lib/testing/mount-in-browser";

export const FIT_LOCALES = ["en", "ha", "ig", "yo"] as const;
export type FitLocale = (typeof FIT_LOCALES)[number];
export const FIT_VIEWPORT = { width: 390, height: 844 };

const SRC = join(__dirname, "..", "..");
const WEB = join(SRC, "..");

/* The newest change anywhere in the sources a cascade is made from. */
function newestSource(dir: string, found = { at: 0 }): number {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) newestSource(path, found);
    else if (/\.(css|tsx?)$/.test(entry.name)) found.at = Math.max(found.at, statSync(path).mtimeMs);
  }
  return found.at;
}

const fontData = (name: string) =>
  `data:font/woff2;base64,${readFileSync(join(WEB, "public", "fonts", name)).toString("base64")}`;

let compiled: Promise<string> | null = null;

/**
 * The stylesheets components import for themselves (a stylesheet import line in the component file) that
 * `globals.css` does not carry: the harness drops every CSS import, so a surface
 * whose rules live in such a sheet (the drag handle's size, the card grid) would
 * be measured unstyled. Taken as the union over the whole source tree, minus the
 * staff console, the development harness and the public site, which are other
 * routes' sheets.
 */
function componentSheets(): string[] {
  const globals = readFileSync(join(SRC, "app", "globals.css"), "utf8");
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        /* The staff console, the development harness and the public site are other routes' sheets, loaded on
           other routes: every route group but `(app)` (the site's and the landing's sheets), which a member's
           page never loads together with its own. */
        if (entry.name === "admin" || entry.name === "(dev)" || (entry.name.startsWith("(") && entry.name !== "(app)") || path.endsWith(join("components", "site"))) continue;
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue;
      for (const m of readFileSync(path, "utf8").matchAll(/^\s*import\s+["']([^"']+\.css)["'];?/gm)) {
        const spec = m[1]!;
        const file = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? join(dir, spec) : null;
        if (!file || !existsSync(file)) continue;
        const rel = file.slice(SRC.length + 1).replace(/\\/g, "/");
        if (globals.includes(`./${rel.replace(/^app\//, "")}`)) continue;
        found.add(file);
      }
    }
  };
  walk(SRC);
  return [...found].sort();
}

/** `globals.css`, compiled as the build compiles it, with the product's fonts inlined. */
export function compiledAppCss(): Promise<string> {
  compiled ??= (async () => {
    const stamp = Math.round(newestSource(SRC));
    const cacheDir = join(tmpdir(), "nf-locale-fit");
    const cache = join(cacheDir, `app-${stamp}.css`);
    if (existsSync(cache)) return readFileSync(cache, "utf8");
    const from = join(SRC, "app", "globals.css");
    const result = await postcss([tailwind()]).process(readFileSync(from, "utf8"), { from });
    const sheets = componentSheets().map((file) => readFileSync(file, "utf8")).join("\n");
    const css = `${result.css}\n${sheets}`.replace(/url\(["']?\/fonts\/([a-z0-9/-]+\.woff2)["']?\)/g, (_m, file: string) => `url("${fontData(file)}")`);
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(cache, css);
    return css;
  })();
  return compiled;
}

/** The compiled cascade plus the sheets a component imports for itself (paths under `src`). */
export async function appCss(...sheets: string[]): Promise<string> {
  return [await compiledAppCss(), ...sheets.map((file) => readFileSync(join(SRC, file), "utf8"))].join("\n");
}

/**
 * The stylesheets a layout imports, in its order (paths under `src`).
 *
 * Member-only sheets left globals for the member layouts (58962be03), so a
 * signed-in screen's cascade is the globals plus whatever its tree's layout
 * imports. Read from the layout itself, so the harness can never drift from
 * what the app loads.
 */
export function layoutSheets(layout: string): string[] {
  const source = readFileSync(join(SRC, layout), "utf8");
  return [...source.matchAll(/^import\s+["']@\/([^"']+\.css)["'];?\s*$/gm)].flatMap((m) => (m[1] ? [m[1]] : []));
}

/** The cascade a screen inside `layout`'s tree gets, plus its own sheets. */
export async function layoutCss(layout: string, ...sheets: string[]): Promise<string> {
  return appCss(...layoutSheets(layout), ...sheets);
}

/**
 * Mount `body` (JSX that may use `t`, the locale's dictionary, and `locale`)
 * at a phone's width, in `locale`. `imports` is the import lines the body needs.
 */
export async function fitMount(opts: {
  locale: FitLocale;
  imports: string;
  body: string;
  css: string;
  /** Extra setup that runs in the entry before the body (module scope). */
  setup?: string;
  /** A page-level surface that draws its own gutters: no padding on the stage. */
  bleed?: boolean;
  reducedMotion?: boolean;
  motion?: "calm" | "off";
  viewport?: { width: number; height: number };
  actions?: Record<string, string>;
}): Promise<Mounted> {
  const entry = `
    import { createRoot } from "react-dom/client";
    import { getDictionary } from "@vallo/i18n";
    import { ClientCopyProvider } from "@/lib/i18n/client-copy";
    import { clientCopyOf } from "@/lib/i18n/client-copy-of";
    ${opts.imports}
    const locale = ${JSON.stringify(opts.locale)};
    const t = getDictionary(locale);
    ${opts.setup ?? ""}
    createRoot(document.getElementById("root")).render(
      <ClientCopyProvider copy={clientCopyOf(t)}>
        <div id="stage" style={{ width: ${(opts.viewport ?? FIT_VIEWPORT).width}, boxSizing: "border-box", padding: ${JSON.stringify(opts.bleed ? "0" : "0 16px 16px")} }}>
          ${opts.body}
        </div>
      </ClientCopyProvider>,
    );
    requestAnimationFrame(() => { window.__mounted = true; });
  `;
  return mountInBrowser({
    entry,
    css: opts.css,
    viewport: opts.viewport ?? FIT_VIEWPORT,
    reducedMotion: opts.reducedMotion,
    motion: opts.motion,
    actions: opts.actions,
    /* The cookie a client hook reads the locale from, and the page's own `lang`. */
    init: `document.cookie = ${JSON.stringify(`${LOCALE_COOKIE}=${opts.locale}; path=/`)}; document.documentElement.lang = ${JSON.stringify(opts.locale)};`,
  });
}

export type FitFindings = { overflow: string[]; clipped: string[]; targets: string[] };

/** Run the audit over `scope` (default: the stage everything is mounted in). */
export async function auditFit(page: Page, scope = "#stage"): Promise<FitFindings> {
  /* Faces first: measured in the fallback font a label can fit and then not. */
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  /* Let any entrance settle; a rise in flight shifts every box by a few pixels. */
  await page.waitForTimeout(900);
  return page.evaluate((sel) => {
    const VW = window.innerWidth;
    const root = (document.querySelector(sel) as HTMLElement | null) ?? document.body;
    const say = (el: Element) => {
      const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      const words = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 70);
      return `${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} "${words}"`;
    };
    const shown = (el: Element) => {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return false;
      if (el.closest("[hidden], [inert]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const inScroller = (el: Element) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) return true;
      }
      return false;
    };
    /* A box as far as it can be SEEN: cut down to every ancestor that hides its overflow, which is how a
       drag fill or a clipped track sits wider than the phone without being a sideways scroll. */
    const visibleBox = (el: Element): { left: number; right: number } | null => {
      const r = el.getBoundingClientRect();
      let left = r.left;
      let right = r.right;
      let fixedBelow = getComputedStyle(el).position === "fixed";
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (!fixedBelow && /(hidden|clip)/.test(s.overflowX) && a !== document.body) {
          const ar = a.getBoundingClientRect();
          left = Math.max(left, ar.left);
          right = Math.min(right, ar.right);
        }
        if (s.position === "fixed") fixedBelow = true;
      }
      return right > left ? { left, right } : null;
    };
    const everything = [root, ...root.querySelectorAll("*")];

    /* 1. Sideways overflow: the page, then any box that sticks out of the phone. */
    const overflow: string[] = [];
    if (document.documentElement.scrollWidth > VW) {
      overflow.push(`page scrolls sideways: ${document.documentElement.scrollWidth}px in a ${VW}px window`);
    }
    for (const el of everything) {
      if (!shown(el) || inScroller(el)) continue;
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      const r = visibleBox(el);
      if (r && (r.right > VW + 0.5 || r.left < -0.5)) {
        overflow.push(`${say(el)} spans ${Math.round(r.left)} to ${Math.round(r.right)} in a ${VW}px window`);
      }
    }

    /* 2. A label cut off where the design wraps it. */
    const clipped: string[] = [];
    /* A control's own LABEL: the control holds nothing but these words. A row that is a link around several lines
       (a conversation, a notification) truncates its preview line by design; that is content, not a label. */
    const squash = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();
    const interactiveLabel = (el: Element) => {
      const control = el.closest("button, a, [role='tab'], [role='radio'], [role='switch'], [role='button'], .nf-chip, .nf-seg");
      return !!control && squash(control.textContent) === squash(el.textContent);
    };
    for (const el of everything) {
      if (!shown(el) || el.closest(".sr-only")) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
      if (!own) continue;
      const s = getComputedStyle(el);
      if (s.webkitLineClamp !== "none") continue;
      const hides = /(hidden|clip)/.test(s.overflowX) || /(hidden|clip)/.test(s.overflowY);
      if (hides && el.scrollWidth > el.clientWidth + 1) {
        const ellipsis = s.textOverflow === "ellipsis";
        if (!ellipsis || interactiveLabel(el)) clipped.push(`${ellipsis ? "ellipsised" : "clipped"} (${el.scrollWidth}px of ${el.clientWidth}px): ${say(el)}`);
      }
      if (hides && el.scrollHeight > el.clientHeight + 1 && s.textOverflow !== "ellipsis") {
        clipped.push(`clipped tall (${el.scrollHeight}px of ${el.clientHeight}px): ${say(el)}`);
      }
      /* Cut by a box above it that hides its overflow. */
      const r = el.getBoundingClientRect();
      let up: Element | null = el.parentElement;
      let fixedBelow = s.position === "fixed";
      for (let depth = 0; up && up !== document.body && up !== document.documentElement && depth < 5; depth += 1, up = up.parentElement) {
        const us = getComputedStyle(up);
        if (us.position === "fixed") fixedBelow = true;
        if (fixedBelow && us.position !== "fixed") continue;
        if (!/(hidden|clip)/.test(us.overflowX) && !/(hidden|clip)/.test(us.overflowY)) continue;
        const ur = up.getBoundingClientRect();
        if (us.webkitLineClamp !== "none" || us.textOverflow === "ellipsis") break;
        if (r.right > ur.right + 1 || r.bottom > ur.bottom + 1) {
          clipped.push(`cut by ${say(up).split(" ")[0]} (text ends at ${Math.round(r.right)}x${Math.round(r.bottom)}, box at ${Math.round(ur.right)}x${Math.round(ur.bottom)}): ${say(el)}`);
          break;
        }
      }
    }

    /* A control whose words stand outside it (a label that does not wrap and does not fit). */
    for (const el of root.querySelectorAll("button, a[href], [role='tab'], [role='radio'], [role='switch']")) {
      if (!shown(el)) continue;
      const s = getComputedStyle(el);
      if (el.tagName === "A" && s.display === "inline") continue;
      const box = el.getBoundingClientRect();
      let left = Infinity;
      let right = -Infinity;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!(n.textContent ?? "").trim()) continue;
        const holder = n.parentElement!;
        if (holder.closest(".sr-only")) continue;
        /* Words that are not drawn (a tab's label until it is the chosen one) cannot spill. */
        let drawn = true;
        let clipL = -Infinity;
        let clipR = Infinity;
        for (let a: Element | null = holder; a && a !== el.parentElement; a = a.parentElement) {
          const as = getComputedStyle(a);
          if (as.visibility === "hidden" || as.display === "none" || parseFloat(as.opacity) === 0) drawn = false;
          if (a !== el && /(hidden|clip)/.test(as.overflowX)) {
            const ar = a.getBoundingClientRect();
            clipL = Math.max(clipL, ar.left);
            clipR = Math.min(clipR, ar.right);
          }
        }
        if (!drawn) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const rr = range.getBoundingClientRect();
        if (rr.width === 0) continue;
        const l = Math.max(rr.left, clipL);
        const r = Math.min(rr.right, clipR);
        if (r <= l) continue;
        left = Math.min(left, l);
        right = Math.max(right, r);
      }
      if (right > left && (right > box.right + 1 || left < box.left - 1)) {
        clipped.push(`label spills out of its control (words ${Math.round(right - left)}px, control ${Math.round(box.width)}px): ${say(el)}`);
      }
    }

    /* 3. Every control reachable by a thumb. */
    const targets: string[] = [];
    const CONTROLS =
      "a[href], button, summary, select, textarea, input:not([type=hidden]):not([type=file]), [role='button'], [role='link'], [role='tab'], [role='radio'], [role='switch'], [role='checkbox'], [role='menuitem'], [role='option']";
    for (const el of root.querySelectorAll(CONTROLS)) {
      if (!shown(el) || el.closest(".sr-only")) continue;
      const s = getComputedStyle(el);
      if (el.tagName === "A" && s.display === "inline") continue;
      const r = el.getBoundingClientRect();
      /* A control may reach 44px with a transparent hit area (`::before`), as `.nf-icon-btn` does. */
      const reach = { w: 0, h: 0 };
      for (const which of ["::before", "::after"]) {
        const pseudo = getComputedStyle(el, which);
        if (pseudo.position === "absolute" && pseudo.content !== "none") {
          reach.w = Math.max(reach.w, parseFloat(pseudo.width) || 0);
          reach.h = Math.max(reach.h, parseFloat(pseudo.height) || 0);
        }
      }
      const w = Math.max(r.width, reach.w);
      const h = Math.max(r.height, reach.h);
      if (w < 43.5 || h < 43.5) targets.push(`${Math.round(r.width * 10) / 10} by ${Math.round(r.height * 10) / 10}: ${say(el)}`);
    }

    const unique = (list: string[]) => [...new Set(list)];
    return { overflow: unique(overflow), clipped: unique(clipped), targets: unique(targets) };
  }, scope);
}
