import "server-only";

import { getDictionary } from "@vallo/i18n";
import { getLocale } from "../locale";

/**
 * What the host server actions say when they refuse, in the host's own
 * language (`experienceHost.refusals`). Read per call: an action is one
 * request, and the locale is that request's. Notes an action writes into a
 * record stay English in the action; only what is said comes from here.
 */
export async function hostRefusals() {
  return getDictionary(await getLocale()).experienceHost.refusals;
}

/** Fill `{name}` placeholders with whole numbers. */
export function fill(line: string, values: Record<string, number>): string {
  return line.replace(/\{(\w+)\}/g, (whole, key: string) => (key in values ? String(values[key]) : whole));
}
