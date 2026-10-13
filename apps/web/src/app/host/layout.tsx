/* C6's member CSS move (6 October): the member-only sheets that left
   `globals.css`, the ones this tree draws, in their old globals order. They
   are the first imports so they keep their old place in the cascade: after
   every global partial, before any sheet this tree's components import. */
import "@/app/social.css";
import "@/app/social-feed.css";
import "@/app/css/motion.css";
import "@/app/css/passcode.css";
import "@/app/css/money-history.css";
import "@/app/css/detail-m.css";
import "@/app/css/member-loop.css";
import type { ReactNode } from "react";
import { PasscodeLayer } from "@/components/passcode/PasscodeLayer";
/* C12: the workspace sheets, out of `globals.css`. stays.css inherits
   agent.css's `nf-host-*` register, so it comes second. */
import "@/app/css/agent.css";
/* catalogue before stays, as when catalogue was global: stays overrides its tiles. */
import "@/app/css/catalogue.css";
import "@/app/css/stays.css";

/**
 * The host workspace's layout. Its only job is the passcode lock
 * (docs/PASSCODE.md): every host screen is drawn only when this session is
 * unlocked, the lock or the setup screen otherwise. Each page still draws its
 * own frame and checks its own access.
 */
export default function HostLayout({ children }: { children: ReactNode }) {
  return <PasscodeLayer>{children}</PasscodeLayer>;
}
