import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SettingsAreaNav } from "./SettingsAreaNav";

/**
 * Every settings route, wrapped once: the glass inner navigation (R3-08) sits
 * above each page, so all of them carry it and a new settings page gets it by
 * being created here. Segment layouts below (payments) still wrap their own.
 *
 * The menu's words come from the reader's dictionary here, on the server, and
 * only that slice (`experienceSettings.area`) crosses to the client island.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = getDictionary(await getLocale());
  return <SettingsAreaNav copy={t.experienceSettings.area}>{children}</SettingsAreaNav>;
}
