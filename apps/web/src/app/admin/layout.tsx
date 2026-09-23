import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { requireAdmin } from "@/lib/admin/guard";
import { getQueueCounts } from "@/lib/admin/queries";
import { getShellIdentity } from "@/lib/app/shell-queries";
import { AccessScreen } from "./_components/AccessScreen";
import { AdminFrame } from "./_components/AdminFrame";
import type { AdminIdentity } from "./_components/AdminNav";
import { EntryGate } from "./_components/EntryGate";
import { BackButton } from "@/components/site/BackButton";
import { ENTRY_COOKIE } from "./_components/entry";

export async function generateMetadata(): Promise<Metadata> {
  const t = getDictionary(await getLocale());
  return { title: t.admin.console.title, robots: { index: false, follow: false } };
}

/**
 * The console shell, drawn from the four admin renders (5EAA44CB, 01F7DFC7,
 * 8E9602E2, C1D98B3C): a lit glass rail on the left with the Vallo mark, the
 * twelve rows and Settings and the operator at its foot; a bar across the
 * main column with the search, the clock, the bell and the operator; the desk
 * below. On a phone the rail becomes a drawer behind the bar's menu button.
 *
 * ACCESS IS DECIDED HERE, ONCE, before a single queue is read: a non-admin
 * gets the access screen and never receives markup carrying platform data.
 * The gate is `requireAdmin` exactly as before; nothing about it moved.
 *
 * WHERE THE CONSOLE LANDS (lead ruling R-E). Every door in the product links
 * `/admin`, and an arrival BY ADDRESS lands there too: the first request to
 * any desk in a browser session is sent to `/admin?next=<desk>` by
 * `EntryGate`, which the overview answers with "You were heading to" as its
 * first link. That includes the sign-in bounce, which returns to the desk
 * address and is caught here. See `_components/entry.ts`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const t = getDictionary(await getLocale());
  const access = await requireAdmin();
  if (access.state !== "admin") return <AccessScreen t={t} state={access.state} />;

  const [counts, shell, jar] = await Promise.all([getQueueCounts(), getShellIdentity(), cookies()]);
  /* R-E: has this browser session opened the overview as this operator? */
  const entered = jar.get(ENTRY_COOKIE)?.value === access.user.id;
  const badges: Record<string, number> = counts.state === "ok" ? { ...counts.data } : {};

  const email = access.user.email ?? "";
  const name = shell.userName && shell.userName !== "Guest" ? shell.userName : email.split("@")[0] || "Admin";
  const identity: AdminIdentity = {
    name,
    role: access.isSuperAdmin ? t.admin.shell.bar.owner : t.admin.shell.bar.operator,
    initial: name.charAt(0).toUpperCase() || "V",
    avatarUrl: shell.avatarUrl || null,
  };

  return (
    <AdminFrame
      identity={identity}
      counts={badges}
      unread={shell.unreadNotifications}
      navLabel={t.admin.console.navLabel}
      navLabels={t.admin.nav}
      searchLabel={t.admin.common.searchLabel}
      bellLabel={t.uiCommon.console.notifications}
      shell={t.admin.shell}
      back={<BackButton fallback="/admin" label={t.common.back} className="nf-admin-back" />}
    >
      <EntryGate entered={entered} userId={access.user.id} opening={t.admin.shell.entry.opening}>
        {children}
      </EntryGate>
    </AdminFrame>
  );
}
