import { Skeleton } from "@/components/ui/Skeleton";
import { Panel } from "@/components/ui/Panel";
import { LoadingShell } from "@/components/app/ScreenSkeleton";

/**
 * The wait on the overview, in the overview's own shape: the pulse strip,
 * four cards, then two rows of two panels. The rail and bar are already on
 * screen (the layout awaited them), so only the desk is outstanding. Desks
 * without their own loading file fall back to this one, which is the same
 * panel grammar they draw.
 */
export default function LoadingAdminOverview() {
  return (
    <LoadingShell label="Loading the console" className="nf-admin-stack">
      <div className="nf-admin-strip">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-admin-strip__cell">
            <Skeleton width="2.75rem" height="2.75rem" radius="sm" />
            <div className="nf-admin-strip__body">
              <Skeleton width="7rem" height="0.875rem" radius="sm" />
              <Skeleton width="5rem" height="1.375rem" radius="sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="nf-admin-kpis">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="nf-admin-kpi">
            <Skeleton width="2.75rem" height="2.75rem" radius="sm" />
            <div className="nf-admin-kpi__body">
              <Skeleton width="8rem" height="1rem" radius="sm" />
              <Skeleton width="6rem" height="2.125rem" radius="sm" />
              <Skeleton width="5rem" height="0.875rem" radius="sm" />
            </div>
          </div>
        ))}
      </div>
      {Array.from({ length: 2 }, (_, row) => (
        <div key={row} className="nf-admin-grid nf-admin-grid--wide-left">
          {Array.from({ length: 2 }, (_, i) => (
            <Panel as="div" key={i} className="nf-admin-panel">
              <Skeleton width="12rem" height="1.125rem" radius="sm" />
              <Skeleton className="mt-md" width="100%" height="12rem" radius="sm" />
            </Panel>
          ))}
        </div>
      ))}
    </LoadingShell>
  );
}
