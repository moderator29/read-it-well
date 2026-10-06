import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE SLICES OF THE DICTIONARY THE WORKSPACE SET-UP SCREENS READ (Session 3,
 * R2; the pattern is `components/auth/auth-copy.ts`).
 *
 * `/profile/setup` and `/profile/setup/owner` handed their client forms the
 * WHOLE dictionary (`t={t}`), and a prop crossing from a server component to
 * a client component is serialised into the page: 137.7 KB gzipped of every
 * surface's words, to draw a list of doors and a four-step form. Each type
 * below is a `Pick` of what one screen reads, the component is typed with it,
 * and the page calls the matching builder, which is written key by key so
 * nothing rides along by accident. A full `Dictionary` is still assignable to
 * every slice, so the preview harnesses that hold one keep working.
 *
 * No words change: every string is the dictionary's own.
 */

/** The add-a-workspace chooser (`AddWorkspaceChooser`): its title lines and the doors. */
export type ChooserCopy = {
  supply: Pick<Dictionary["supply"], "chooser" | "doors">;
};

export function forChooser(t: Dictionary): ChooserCopy {
  return { supply: { chooser: t.supply.chooser, doors: t.supply.doors } };
}

/** The owner's registration (`OwnerRegisterForm`, its done screen and the pickers on screen two). */
export type OwnerCopy = {
  supply: Pick<Dictionary["supply"], "register">;
  success: Dictionary["success"];
  pickers: Dictionary["pickers"];
};

export function forOwner(t: Dictionary): OwnerCopy {
  return { supply: { register: t.supply.register }, success: t.success, pickers: t.pickers };
}
