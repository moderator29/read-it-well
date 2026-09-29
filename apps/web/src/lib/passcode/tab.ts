/**
 * "This tab has been unlocked", in sessionStorage, which is per tab and ends
 * with it. A tab without the mark is a new tab (or a new browser session),
 * and the passcode guard locks it on arrival. A convenience of the lock, not
 * its boundary: the boundary is the httpOnly unlock cookie the server reads.
 * Storage that throws (a private window, blocked site data) reads as "new
 * tab", which only ever asks for the passcode once more.
 */
export const TAB_KEY = "vallo.passcode.tab";

export function markTabUnlocked(): void {
  try {
    window.sessionStorage.setItem(TAB_KEY, "1");
  } catch {
    /* See above: nothing to remember it in. */
  }
}

export function tabWasUnlocked(): boolean {
  try {
    return window.sessionStorage.getItem(TAB_KEY) === "1";
  } catch {
    return false;
  }
}

export function forgetTab(): void {
  try {
    window.sessionStorage.removeItem(TAB_KEY);
  } catch {
    /* Nothing was kept. */
  }
}

/** `{name}` style placeholders, filled from `vars`. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

/** The path and query the member is on, for a `next` after signing in again. */
export function herePath(): string {
  try {
    return `${window.location.pathname}${window.location.search}`;
  } catch {
    return "/home";
  }
}
