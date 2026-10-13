import type { AgentApplicationStatus } from "./types";

/**
 * THE STATES IN WHICH AN APPLICATION IS STILL OPEN.
 *
 * Submitted and under review wait on a reviewer; more information required
 * waits on the applicant, who answers it on `/profile/application`. While one
 * of these is on file a second application is refused, by the setup pages
 * before the form is filled in and by both filing actions as the gate. A
 * decided application (approved, rejected, suspended) and a draft are not
 * open. Pure, so the pages, the actions and their tests read one list.
 */
export const OPEN_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "MORE_INFO_REQUIRED",
] as const satisfies readonly AgentApplicationStatus[];

export function isOpenApplication(status: string | null | undefined): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status ?? "");
}
