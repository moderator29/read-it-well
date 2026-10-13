import type { ReactNode } from "react";
import { getDictionary } from "@vallo/i18n";
import { getLocale } from "@/lib/locale";
import { SettingsAreaNav } from "./SettingsAreaNav";
import "./settings-physical.css";

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
  /* D74: every switch on a settings page is a physical object, a brushed
     track and a domed platinum knob (`settings-physical.css`). */
  return (
    <SettingsAreaNav copy={t.experienceSettings.area}>
      <div className="nf-settings-physical">{children}</div>
    </SettingsAreaNav>
  );
}
