import type { ReactNode } from "react";
import type { Dictionary } from "@vallo/i18n/core";
import { AdminFrame } from "@/app/admin/_components/AdminFrame";
import { PERSON } from "../_fixtures/people";

/**
 * The console's REAL frame (`AdminFrame`) around a preview body, so the
 * harness shows the rail, bar and body the operators get rather than a
 * hand-built copy of them that drifts. The real layout gates on the admin
 * guard and a security key, which a headless sandbox cannot pass; these
 * counts and this identity are fixtures and say nothing about the queue.
 */
export const PREVIEW_COUNTS: Record<string, number> = {
  listings: 18,
  applications: 5,
  reports: 3,
  tickets: 3,
  flags: 6,
  moderation: 2,
  alerts: 4,
};

export function AdminPreviewFrame({ t, children }: { t: Dictionary; children: ReactNode }) {
  return (
    <AdminFrame
      identity={{
        name: PERSON.name,
        role: t.admin.shell.bar.operator,
        initial: PERSON.name.charAt(0),
        avatarUrl: PERSON.avatarUrl ?? null,
        tier: null,
      }}
      counts={PREVIEW_COUNTS}
      unread={2}
      navLabel={t.admin.console.navLabel}
      navLabels={t.admin.nav}
      searchLabel={t.admin.common.searchLabel}
      bellLabel={t.uiCommon.console.notifications}
      shell={t.admin.shell}
    >
      {children}
    </AdminFrame>
  );
}
