import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE SHELL'S SLICE OF THE DICTIONARY (Track M performance, 25 September 2026).
 *
 * `AppShell` is a client component, so whatever the (app) layout hands it as
 * `t` is serialised into the page. It was handed the WHOLE dictionary: every
 * string of every surface, 365 KB of JSON, in the HTML of every first load,
 * when the header, the drawer, the dock and the switch read a small part of
 * it. The founder asked for an app that loads fast with no "booting"; this was
 * the single largest thing every page carried for no reader.
 *
 * The first cut sent whole namespaces (58 KB), found by an import walker that
 * also counted `t.nav.settings` as the `settings` namespace. This one is
 * typed: `AppShell` and everything it hands `t` to take a `ShellDictionary`,
 * so the compiler refuses any read that is not carried here, and the shell
 * carries only the lines it draws (about 4 KB; the test holds it under 8).
 * A full dictionary still fits wherever a `ShellDictionary` is asked for, so
 * the previews and the admin console that pass one need no change.
 */
export type ShellDictionary = Pick<Dictionary, "a11y" | "common" | "nav" | "side"> & {
  shape: Pick<Dictionary["shape"], "workspace" | "plans">;
  supply: Pick<Dictionary["supply"], (typeof SUPPLY_KEYS)[number]>;
  priceCheck: Pick<Dictionary["priceCheck"], "title">;
  pickers: Pick<Dictionary["pickers"], "close">;
  /** The navigation's own new lines (the Payments and Invite rows). */
  experienceShell: Pick<Dictionary["experienceShell"], "navPayments" | "navInvite">;
  /** The Rewards row's label is the Rewards page's own title, so the two cannot drift. */
  experienceRewards: Pick<Dictionary["experienceRewards"], "title">;
};

/** The workspace switcher's lines. */
const SUPPLY_KEYS = [
  "switchTitle",
  "personal",
  "personalMeaning",
  "addTitle",
  "addMeaning",
  "current",
  "empty",
  "switchTrigger",
  "kinds",
  "standings",
] as const;

const cache = new WeakMap<Dictionary, ShellDictionary>();

export function shellDictionary(t: Dictionary): ShellDictionary {
  const cached = cache.get(t);
  if (cached) return cached;
  const shell: ShellDictionary = {
    a11y: t.a11y,
    common: t.common,
    nav: t.nav,
    side: t.side,
    shape: { workspace: t.shape.workspace, plans: t.shape.plans },
    supply: Object.fromEntries(SUPPLY_KEYS.map((key) => [key, t.supply[key]])) as ShellDictionary["supply"],
    priceCheck: { title: t.priceCheck.title },
    pickers: { close: t.pickers.close },
    experienceShell: { navPayments: t.experienceShell.navPayments, navInvite: t.experienceShell.navInvite },
    experienceRewards: { title: t.experienceRewards.title },
  };
  cache.set(t, shell);
  return shell;
}
