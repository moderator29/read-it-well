import { CHROME_COLOUR, CHROME_COLOUR_LIGHT } from "./chrome";

/**
 * LIGHT MODE, REINTRODUCED. The founder reversed the "dark only" rule on
 * 25 September 2026; this file is the one home of the choice.
 *
 * THE CHOICE lives in two places on purpose:
 *   - the `nf_theme` COOKIE, which the root layout reads so the server renders
 *     `<html data-theme="light">` for an explicit Light and nothing flashes;
 *   - `localStorage` under the same key, which the before-paint script reads
 *     too, so a cookie cleared by the browser does not lose the choice.
 *
 * "system" cannot be resolved on the server (the OS preference is not sent),
 * so it renders dark and the before-paint script flips it before first paint.
 *
 * THE DEFAULT IS DARK. The brand was designed at night and every surface has
 * been proven there; light is chosen, never imposed on somebody who opened the
 * app yesterday and saw it dark.
 */

export type ThemeChoice = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "nf_theme";
export const DEFAULT_THEME: ThemeChoice = "dark";
export const THEME_CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"];

export function parseThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" || value === "system" ? value : DEFAULT_THEME;
}

/** What the server can know. `system` renders dark until the script runs. */
export function serverTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "light" ? "light" : "dark";
}

export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): ResolvedTheme {
  if (choice === "system") return prefersLight ? "light" : "dark";
  return choice;
}

/**
 * The before-paint script, as a string for `dangerouslySetInnerHTML`. It is
 * written out in full rather than generated so the CSP nonce covers exactly
 * the text a reviewer reads. It never throws: storage, cookies and
 * `matchMedia` can each be missing in a webview.
 */
export const THEME_BOOT_SCRIPT =
  "try{var k='nf_theme',d=document.documentElement,c=null;" +
  "try{c=localStorage.getItem(k)}catch(e){}" +
  "if(c!=='light'&&c!=='dark'&&c!=='system'){var m=document.cookie.match(/(?:^|; )nf_theme=([^;]*)/);c=m?m[1]:'dark'}if(c!=='light'&&c!=='system')c='dark';" +
  "var l=c==='light'||(c==='system'&&window.matchMedia&&matchMedia('(prefers-color-scheme: light)').matches);" +
  "d.dataset.theme=l?'light':'dark';d.dataset.themeChoice=c;" +
  `var t=document.querySelector('meta[name=theme-color]');if(t)t.setAttribute('content',l?'${CHROME_COLOUR_LIGHT}':'${CHROME_COLOUR}')` +
  "}catch(e){}";
