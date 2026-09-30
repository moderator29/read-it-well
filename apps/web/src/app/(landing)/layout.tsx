import type { ReactNode } from "react";
/* C12: the landing's sheets, out of `globals.css`, in their old cascade
   order. The check room's card is a public door, so public-doors.css too.
   landing-3d.css is imported by LandingBody itself. */
import "@/app/css/landing.css";
import "@/app/css/landing-rooms.css";
import "@/app/css/public-doors.css";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return children;
}
