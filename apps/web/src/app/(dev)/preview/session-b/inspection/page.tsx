import { InspectionFixture } from "./fixture";

export const dynamic = "force-dynamic";

/**
 * Session B's proof harness for the inspection surface (lead ruling R-G), so
 * the shots in docs/design/proofs/session-b/inspection/ can be re-run behind
 * the preview gate. `?side=lister` shows the lister's side, `?state=<STATE>`
 * any state. The same page inside the app shell is `./shell`.
 */
export default async function SessionBInspectionPreview({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; state?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="nf-shell py-section-tight">
      <InspectionFixture side={params.side} state={params.state} />
    </div>
  );
}
