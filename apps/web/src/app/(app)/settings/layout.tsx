import type { ReactNode } from "react";
import { SettingsAreaNav } from "./SettingsAreaNav";

/**
 * Every settings route, wrapped once: the glass inner navigation (R3-08) sits
 * above each page, so all of them carry it and a new settings page gets it by
 * being created here. Segment layouts below (payments) still wrap their own.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsAreaNav>{children}</SettingsAreaNav>;
}
