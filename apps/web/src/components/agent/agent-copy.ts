import type { Dictionary } from "@vallo/i18n/core";
import type { UploadCopy } from "@/components/supply/supply-copy";

/**
 * THE SLICES OF THE DICTIONARY THE AGENT APPLICATION SCREENS READ.
 *
 * `/profile/setup/[role]` and `/profile/application` handed the whole
 * dictionary to a client component (`t={t}`), which is serialised into the
 * page's payload: about 440KB for screens that read two small namespaces
 * (`components/auth/auth-copy.ts` is the same pattern). Each type is a `Pick`
 * of what the component reads, and the component is typed with it, so reading
 * anything else is a compile error until it is added here on purpose. A full
 * `Dictionary` is still assignable to each slice. No word changes.
 */

/** The application wizard (`ApplyWizard`): its own lines and the success sheet's. */
export type ApplyCopy = {
  agent: Pick<Dictionary["agent"], "apply">;
  success: {
    moments: Pick<Dictionary["success"]["moments"], "agentApplied">;
    continue: Dictionary["success"]["continue"];
  };
};

export function forApply(t: Dictionary): ApplyCopy {
  return {
    agent: { apply: t.agent.apply },
    success: { moments: { agentApplied: t.success.moments.agentApplied }, continue: t.success.continue },
  };
}

/** The reply to a reviewer's request (`RespondToReview`), plus the two upload cards it draws. */
export type RespondCopy = UploadCopy & {
  agent: { status: Pick<Dictionary["agent"]["status"], "respond"> };
};

export function forRespond(t: Dictionary): RespondCopy {
  return {
    agent: { status: { respond: t.agent.status.respond } },
    supply: { register: t.supply.register },
  };
}
