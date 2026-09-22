// Session B admin-shell fixture harness (R-G), behind the preview gate.
import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { AdminFrame } from "@/app/admin/_components/AdminFrame";
import { COUNTS, IDENTITY } from "./fixtures";

export function Frame({ children }: { children: ReactNode }) {
  const t = getDictionary("en");
  return (
    <AdminFrame identity={IDENTITY} counts={COUNTS} unread={2} navLabel="Admin console" navLabels={t.admin.nav} searchLabel="Search" bellLabel="Notifications">
      {children}
    </AdminFrame>
  );
}
