import type { ReactNode } from "react";
import type { Dictionary } from "@vallo/i18n";
import { AdminFrame } from "@/app/admin/_components/AdminFrame";
export function Frame({ t, children }: { t: Dictionary; children: ReactNode }) {
  return (
    <AdminFrame identity={{ name: "Seyi Omojuni", role: "Platform Operator", initial: "S", avatarUrl: null }} counts={{}} unread={0} navLabel={t.admin.console.navLabel} navLabels={t.admin.nav} searchLabel={t.admin.common.searchLabel} bellLabel={t.uiCommon.console.notifications}>
      {children}
    </AdminFrame>
  );
}
