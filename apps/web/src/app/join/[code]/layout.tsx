import type { ReactNode } from "react";
/* C12: the door page's column (`nf-door-page`) lives in the public doors
   sheet, which left `globals.css`. */
import "@/app/css/public-doors.css";
/* The invite door's own material: the Island, the wash, the arrival. */
import "../join.css";

export default function JoinLayout({ children }: { children: ReactNode }) {
  return children;
}
