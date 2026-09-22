import type { Locale } from "@vallo/i18n";
import type { ActionResult } from "@/lib/actions/envelope";
import type { HostDraft, HostStepId } from "@/lib/host/onboarding";

/**
 * WHAT A DRAWN STAYS PANEL IS HANDED.
 *
 * Structurally the wizard's own `StepProps`, declared here rather than
 * imported from `HostWizard` so that six step bodies do not have to import the
 * component that renders them. It is a type, so nothing is duplicated at
 * runtime and the compiler still refuses a panel the wizard cannot feed.
 */
export type StaysStepProps = {
  draft: HostDraft;
  set: <K extends keyof HostDraft>(key: K, value: HostDraft[K]) => void;
  /**
   * The cancellation policies a rate or a property may name.
   *
   * `isFreeUntilHours` rides along because `GOVERNING-10` screen three draws a
   * switch called "Free cancellation" and a row that says how long it lasts,
   * and that column is the only thing in this database that knows either.
   * Null means a policy is never free.
   */
  policies: { id: string; name: string; summary: string; isFreeUntilHours: number | null }[];
  locale: Locale;
  pending: boolean;
  fieldErrors: Record<string, string>;
  run: (work: () => Promise<ActionResult<unknown>>, then?: (data: unknown) => void) => void;
  /** Save the typed business fields, optionally with extra keys. */
  saveText: (extra?: Record<string, unknown>, then?: () => void) => void;
  setNotice: (notice: { tone: "ok" | "error"; text: string } | null) => void;
  /** Jump to another step, for a row whose chevron opens one. */
  goTo: (id: HostStepId) => void;
  /**
   * Move to the next step.
   *
   * Every drawn screen ends in one primary called Continue, which the render
   * puts INSIDE the screen rather than in a footer beside a Back. So the panel
   * owns its own forward control, and this is how it moves the wizard: a save
   * and an advance are one act to the person pressing it, and two acts here
   * would let one happen without the other.
   */
  advance: () => void;
};
