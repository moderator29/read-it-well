import type { ReactNode } from "react";
/* C12: the door page's column (`nf-door-page`) lives in the public doors
   sheet, which left `globals.css`. */
import "@/app/css/public-doors.css";

export default function EmailPreferencesLayout({ children }: { children: ReactNode }) {
  return children;
}
