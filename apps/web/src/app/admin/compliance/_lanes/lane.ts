import type { ReactNode } from "react";
import type { Dictionary, Locale } from "@vallo/i18n/core";

/**
 * ONE COMPLIANCE LANE. SCUML AML/CFT desk.
 *
 * Each obligation is one lane file under `_lanes/` exporting one of these,
 * and one line in the `LANES` array in `../page.tsx`. A lane reads its own
 * data, and draws its own three states: the work, an honest empty ("nothing
 * waiting"), and a failure that says the check could not run (never "no
 * hits"). The page draws the tabs and the heading around it.
 */
export type ComplianceLaneProps = {
  t: Dictionary;
  locale: Locale;
  /** The page's search params, for a lane's own filters. */
  params: Record<string, string | string[] | undefined>;
};

export type ComplianceLane = {
  /** The `?tab=` value; stable, lower case. */
  key: string;
  /** The SCUML checklist item(s) this lane discharges, for the examiner. */
  items: readonly number[];
  title: (t: Dictionary) => string;
  Lane: (props: ComplianceLaneProps) => Promise<ReactNode> | ReactNode;
};
