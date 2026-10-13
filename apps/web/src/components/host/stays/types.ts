import type { Locale } from "@vallo/i18n/core";
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
  policies: {
    id: string;
    name: string;
    summary: string;
    isFreeUntilHours: number | null;
    /** The refund tiers, `[{hours_before, refund_bps}]`, printed in plain words. */
    rules?: unknown;
    /** flexible, moderate, firm or strict, when the policy is one of the presets. */
    preset?: string | null;
  }[];
  locale: Locale;
  pending: boolean;
  fieldErrors: Record<string, string>;
  run: (work: () => Promise<ActionResult<unknown>>, then?: (data: unknown) => void) => void;
  /**
   * `run`, awaitable: resolves true when the write succeeded and false when
   * it was refused (the refusal is shown as `run` shows it). It is what a
   * step's save is built on, so the same save serves its own Continue and
   * the wizard's "Save and go back".
   */
  runAsync: (work: () => Promise<ActionResult<unknown>>) => Promise<boolean>;
  /** Save the typed business fields, optionally with extra keys. */
  saveText: (extra?: Record<string, unknown>, then?: () => void) => void;
  /** `saveText`, awaitable: true when the business fields were saved. */
  saveTextAsync: (extra?: Record<string, unknown>) => Promise<boolean>;
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
  /**
   * Move on WITHOUT saving: the wizard asks first if anything on the step is
   * unsaved. For a Continue that is not itself a save (the rates screen,
   * whose rates and policy save as they are set).
   */
  proceed: () => void;
};
