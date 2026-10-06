import type { Dictionary } from "@vallo/i18n/core";
import type { HostInnerPage } from "./HostInnerNav";

/**
 * The inner navigation's words, read on the server so the client wrapper is
 * handed plain strings (M-2). The page names are the desk's own nav labels,
 * so the inner nav and the chip row can never call one page two things.
 */
export function hostInnerNavCopy(t: Dictionary): {
  labels: Record<HostInnerPage, string>;
  label: string;
  toggleLabel: string;
} {
  const w = t.experienceFeatures.workspace;
  return {
    labels: {
      decide: t.hostNav.decide,
      calendar: t.hostNav.calendar,
      rooms: t.hostNav.rooms,
      earnings: t.hostNav.earnings,
      statements: w.statements,
    },
    label: w.innerNav,
    toggleLabel: w.innerNavToggle,
  };
}
