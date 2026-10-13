/* C6's member CSS move (6 October): the member-only sheets that left
   `globals.css`. The gallery mounts member components with fixtures, so it
   loads them all, in their old globals order and first, as the member
   layouts do. The page keeps its own gate (`previewHarnessIsOpen`). */
import "@/app/social.css";
import "@/app/social-feed.css";
import "@/app/css/motion.css";
import "@/app/css/passcode.css";
import "@/app/css/photo-viewer.css";
import "@/app/css/filter-tiles.css";
import "@/app/css/threads.css";
import "@/app/css/member-kit.css";
import "@/app/css/money-history.css";
import "@/app/css/flow-m.css";
import "@/app/css/detail-m.css";
import "@/app/css/member-loop.css";

import type { ReactNode } from "react";

export default function GalleryLayout({ children }: { children: ReactNode }) {
  return children;
}
