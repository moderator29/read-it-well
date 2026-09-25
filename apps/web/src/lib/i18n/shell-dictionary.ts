import type { Dictionary } from "@vallo/i18n/core";
import { sliceDictionary } from "./slice";

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
 * The namespaces are the ones the shell's whole import graph can reach, as
 * `shell-dictionary.test.ts` computes it; that test fails the build the day
 * the shell starts reading one that is not here.
 */
export const SHELL_NAMESPACES = [
  "a11y",
  "common",
  "home",
  "nav",
  "pickers",
  "priceCheck",
  "settings",
  "shape",
  "side",
  "signUp",
  "stays",
  "supply",
] as const satisfies readonly (keyof Dictionary)[];

export function shellDictionary(t: Dictionary): Dictionary {
  return sliceDictionary(t, SHELL_NAMESPACES);
}
