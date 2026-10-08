import { notFound } from "next/navigation";
import { getDictionary } from "@vallo/i18n";
import { CallsPreview } from "../CallsPreview";
import { CALL_PREVIEW_STATES, type CallPreviewState } from "../fixtures";

/**
 * /preview/calls/<state>: one call screen on fixtures, for screenshots. The
 * real view components with invented props; no call, no camera (a canvas
 * stream stands in for the videos), no server action is triggered by
 * rendering. See `scripts/calls/ui-e2e.mjs` for the same components driven
 * through a real call against a local media server.
 */
export default async function CallPreviewPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!(CALL_PREVIEW_STATES as readonly string[]).includes(state)) notFound();
  return <CallsPreview state={state as CallPreviewState} copy={getDictionary("en").calls} />;
}
